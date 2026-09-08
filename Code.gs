/**
 * 香港基督少年軍第82分隊 - 中級組獎章系統 8.0 終極旗艦版
 * 特性：開立新隊員全表 100% 同步、刪除隊員跨表抹除、全功能即時編輯、審計日誌
 */

function getAdminPassword() {
  const props = PropertiesService.getScriptProperties();
  let pwd = props.getProperty("ADMIN_PASSWORD");
  if (!pwd) {
    pwd = "BB82Badges";
    props.setProperty("ADMIN_PASSWORD", pwd);
  }
  return pwd;
}

function verifyAdmin(password) {
  return password === getAdminPassword();
}

function changeAdminPassword(oldPwd, newPwd) {
  if (oldPwd !== getAdminPassword()) {
    return { success: false, message: "現有管理密碼不正確！" };
  }
  if (!newPwd || newPwd.trim().length < 6) {
    return { success: false, message: "新密碼長度必須至少為 6 個字元！" };
  }
  PropertiesService.getScriptProperties().setProperty("ADMIN_PASSWORD", newPwd.trim());
  writeAuditLog("密碼變更", "系統管理員", "管理員登入密碼已更新");
  return { success: true, message: "管理密碼已成功變更，請妥善保管！" };
}

function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("香港基督少年軍第82分隊 - 隊員獎章數位檔案管理系統")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function cleanCell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (s.startsWith("#") || s === "NO_HEADER") return "";
  return s;
}

function writeAuditLog(actionType, targetMember, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("系統修改日誌");
    if (!sheet) {
      sheet = ss.insertSheet("系統修改日誌");
      sheet.appendRow(["紀錄時間", "操作類型", "對象隊員", "詳細變更內容"]);
      sheet.getRange("A1:D1").setBackground("#0e2a47").setFontColor("#ffffff").setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    const timeStr = Utilities.formatDate(new Date(), "Asia/Hong_Kong", "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([timeStr, actionType, targetMember, details]);
  } catch (e) {
    console.error("Audit log error: " + e.toString());
  }
}

function getAuditLogs(adminPassword) {
  if (!verifyAdmin(adminPassword)) {
    return { success: false, message: "無權限存取系統日誌" };
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("系統修改日誌");
  if (!sheet) return { success: true, logs: [] };
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, logs: [] };
  
  const logs = [];
  for (let r = data.length - 1; r >= 1 && logs.length < 80; r--) {
    logs.push({
      time: data[r][0] instanceof Date ? Utilities.formatDate(data[r][0], "Asia/Hong_Kong", "yyyy-MM-dd HH:mm:ss") : String(data[r][0]),
      action: String(data[r][1] || ""),
      target: String(data[r][2] || ""),
      details: String(data[r][3] || "")
    });
  }
  return { success: true, logs: logs };
}

function getAllMemberIds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("最高榮譽獎章");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const ids = [];
  for (let r = 6; r < data.length; r++) {
    const id = cleanCell(data[r][1]);
    const name = cleanCell(data[r][2]);
    if (id && name) {
      ids.push({ id: id, name: name });
    }
  }
  return ids;
}

function getSuggestedNextMemberId() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("最高榮譽獎章");
  if (!sheet) return "82-350C";
  
  const data = sheet.getDataRange().getValues();
  let maxNum = 0;
  for (let r = 6; r < data.length; r++) {
    const id = String(data[r][1] || "").trim().toUpperCase();
    const match = id.match(/82-(\d+)C/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum > 0 ? (maxNum + 1) : 344;
  return "82-" + (nextNum < 100 ? ("0" + nextNum) : nextNum) + "C";
}

// 核心健壯輔助函式：在特定分頁定位最後一位隊員列並安全插入資料
function safeInsertMemberIntoSheet(sheetName, idColIndex, memberId, cellUpdates) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;

    const data = sheet.getDataRange().getValues();
    let insertAfterRow = -1;

    // 由下往上掃描最後一個隊員號碼 82-xxxC
    for (let r = data.length - 1; r >= 4; r--) {
      const val = String(data[r][idColIndex] || "").trim().toUpperCase();
      if (val.startsWith("82-") && val.endsWith("C")) {
        insertAfterRow = r + 1; // 轉為 1-based
        break;
      }
    }

    if (insertAfterRow === -1) {
      insertAfterRow = sheet.getLastRow();
    }

    sheet.insertRowAfter(insertAfterRow);
    const newRow = insertAfterRow + 1;

    // 個別單元格安全寫入，絕不受欄數長度不符限制
    cellUpdates.forEach(item => {
      sheet.getRange(newRow, item.col).setValue(item.val);
    });

    return true;
  } catch (err) {
    console.error("Error inserting into " + sheetName + ": " + err.toString());
    return false;
  }
}

// 【開立新隊員】：100% 毫秒級全表同步開立
function createNewMemberProfile(adminPassword, payload) {
  if (!verifyAdmin(adminPassword)) {
    return { success: false, message: "管理密碼錯誤，拒絕開立隊員檔案！" };
  }

  const memberId = String(payload.memberId || "").trim().toUpperCase();
  const memberName = String(payload.name || "").trim();
  if (!memberId || !memberName) {
    return { success: false, message: "隊員證編號與姓名均為必填！" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const honorSheet = ss.getSheetByName("最高榮譽獎章");
  if (!honorSheet) return { success: false, message: "找不到《最高榮譽獎章》工作表" };

  // 查重
  const hData = honorSheet.getDataRange().getValues();
  for (let r = 6; r < hData.length; r++) {
    if (String(hData[r][1] || "").trim().toUpperCase() === memberId) {
      return { success: false, message: "隊員編號「" + memberId + "」已存在，無法重複開立！" };
    }
  }

  const serialNum = hData.length - 6 + 1;
  const currentYear = new Date().getFullYear();

  // 1. 最高榮譽獎章 (Col B 為編號: col 2)
  safeInsertMemberIntoSheet("最高榮譽獎章", 1, memberId, [
    { col: 1, val: serialNum },
    { col: 2, val: memberId },
    { col: 3, val: memberName },
    { col: 4, val: payload.juniorGold || "" }
  ]);

  // 2. 獎章總表 (Col B 為編號: col 2)
  safeInsertMemberIntoSheet("獎章總表", 1, memberId, [
    { col: 1, val: serialNum },
    { col: 2, val: memberId },
    { col: 3, val: memberName },
    { col: 4, val: "P" }, // 活躍
    { col: 5, val: currentYear },
    { col: 6, val: 1 },
    { col: 7, val: currentYear },
    { col: 8, val: 1 },
    { col: 9, val: payload.juniorGold || "" }
  ]);

  // 3. 必修獎章 (Col B 為編號: col 2)
  safeInsertMemberIntoSheet("必修獎章", 1, memberId, [
    { col: 1, val: serialNum },
    { col: 2, val: memberId },
    { col: 3, val: memberName }
  ]);

  // 4. 甲組獎章 (Col B 為編號: col 2)
  safeInsertMemberIntoSheet("甲組獎章", 1, memberId, [
    { col: 1, val: serialNum },
    { col: 2, val: memberId },
    { col: 3, val: memberName }
  ]);

  // 5. 乙組獎章 (Col C 為編號: col 3, Col D 為姓名: col 4)
  safeInsertMemberIntoSheet("乙組獎章", 2, memberId, [
    { col: 1, val: serialNum },
    { col: 3, val: memberId },
    { col: 4, val: memberName }
  ]);

  // 6. 運動員布章 (Col B 為編號: col 2)
  safeInsertMemberIntoSheet("運動員布章", 1, memberId, [
    { col: 1, val: serialNum },
    { col: 2, val: memberId },
    { col: 3, val: memberName }
  ]);

  // 7. 獎章Progression (Col B 為編號: col 2)
  safeInsertMemberIntoSheet("獎章Progression", 1, memberId, [
    { col: 1, val: serialNum },
    { col: 2, val: memberId },
    { col: 3, val: memberName },
    { col: 4, val: 0 },
    { col: 7, val: 0 },
    { col: 8, val: 0 },
    { col: 11, val: 0 }
  ]);

  SpreadsheetApp.flush();
  writeAuditLog("開立新隊員", memberName + " (" + memberId + ")", "全表 7 個工作表同步建立檔案成功");

  return {
    success: true,
    message: "隊員【" + memberName + " (" + memberId + ")】之個人檔案已成功同步開立於所有工作表！",
    memberId: memberId
  };
}

// 【刪除隊員功能】：跨所有分頁同步抹除紀錄並寫入審計日誌
function deleteMemberProfile(adminPassword, memberId) {
  if (!verifyAdmin(adminPassword)) {
    return { success: false, message: "管理密碼錯誤，拒絕執行刪除操作！" };
  }

  const targetId = String(memberId || "").trim().toUpperCase();
  if (!targetId) return { success: false, message: "請指定要刪除的隊員證編號！" };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsToCheck = [
    { name: "最高榮譽獎章", colIdx: 1 },
    { name: "獎章總表", colIdx: 1 },
    { name: "必修獎章", colIdx: 1 },
    { name: "甲組獎章", colIdx: 1 },
    { name: "乙組獎章", colIdx: 2 },
    { name: "運動員布章", colIdx: 1 },
    { name: "獎章Progression", colIdx: 1 }
  ];

  let memberName = targetId;
  let deletedCount = 0;

  sheetsToCheck.forEach(item => {
    const sheet = ss.getSheetByName(item.name);
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let r = data.length - 1; r >= 4; r--) {
        if (String(data[r][item.colIdx] || "").trim().toUpperCase() === targetId) {
          if (data[r][2] && !memberName.includes(" ")) {
            memberName = String(data[r][2]).trim();
          }
          sheet.deleteRow(r + 1);
          deletedCount++;
          break;
        }
      }
    }
  });

  SpreadsheetApp.flush();
  writeAuditLog("刪除隊員檔案", memberName + " (" + targetId + ")", "已從 " + deletedCount + " 個工作表中徹底刪除此隊員列");

  return {
    success: true,
    message: "隊員【" + memberName + " (" + targetId + ")】之檔案已自試算表中安全刪除！"
  };
}

// 核心查詢函數
function getMemberFullData(memberId) {
  if (!memberId) return { success: false, message: "請輸入隊員證編號" };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetId = memberId.trim().toUpperCase();

  const honorSheet = ss.getSheetByName("最高榮譽獎章");
  if (!honorSheet) return { success: false, message: "找不到「最高榮譽獎章」工作表" };
  
  const honorData = honorSheet.getDataRange().getValues();
  let honorRowIndex = -1;
  let memberName = "";

  for (let r = 0; r < honorData.length; r++) {
    if (String(honorData[r][1] || "").trim().toUpperCase() === targetId) {
      honorRowIndex = r;
      memberName = cleanCell(honorData[r][2]);
      break;
    }
  }

  if (honorRowIndex === -1) {
    return { success: false, message: "系統找不到隊員證編號為「" + targetId + "」的紀錄，請確認後再試！" };
  }

  const hRow = honorData[honorRowIndex];
  const highestHonor = {
    juniorGold: cleanCell(hRow[3]),
    bncoStatus: cleanCell(hRow[4]),
    bncoCert: cleanCell(hRow[5]),
    ancoStatus: cleanCell(hRow[6]),
    ancoCert: cleanCell(hRow[7]),
    stripe1: cleanCell(hRow[8]),
    stripe2: cleanCell(hRow[9]),
    stripe3: cleanCell(hRow[10]),
    stripe4: cleanCell(hRow[11]),
    founderBadge: cleanCell(hRow[12]),
    presidentBadge: cleanCell(hRow[13])
  };

  let profile = {
    joinYear: "-",
    yearsCount: "-",
    jsJoinYear: "-",
    jsYearsCount: "-",
    isActive: "活躍中"
  };
  const summarySheet = ss.getSheetByName("獎章總表");
  if (summarySheet) {
    const sData = summarySheet.getDataRange().getValues();
    for (let r = 0; r < sData.length; r++) {
      if (String(sData[r][1] || "").trim().toUpperCase() === targetId) {
        profile.joinYear = cleanCell(sData[r][4]) || "-";
        profile.yearsCount = cleanCell(sData[r][5]) || "-";
        profile.jsJoinYear = cleanCell(sData[r][6]) || "-";
        profile.jsYearsCount = cleanCell(sData[r][7]) || "-";
        profile.isActive = cleanCell(sData[r][3]) === "P" ? "活躍中" : "非活躍/退役";
        
        if (!highestHonor.bncoStatus && cleanCell(sData[r][9])) highestHonor.bncoStatus = cleanCell(sData[r][9]);
        if (!highestHonor.ancoStatus && cleanCell(sData[r][10])) highestHonor.ancoStatus = cleanCell(sData[r][10]);
        if (!highestHonor.stripe1 && cleanCell(sData[r][11])) highestHonor.stripe1 = cleanCell(sData[r][11]);
        if (!highestHonor.stripe2 && cleanCell(sData[r][12])) highestHonor.stripe2 = cleanCell(sData[r][12]);
        if (!highestHonor.stripe3 && cleanCell(sData[r][13])) highestHonor.stripe3 = cleanCell(sData[r][13]);
        if (!highestHonor.stripe4 && cleanCell(sData[r][14])) highestHonor.stripe4 = cleanCell(sData[r][14]);
        break;
      }
    }
  }

  let currentRank = "中級組隊員 (Private)";
  if (highestHonor.stripe4) currentRank = "四劃 (Staff Sergeant)";
  else if (highestHonor.stripe3) currentRank = "三劃 (Sergeant)";
  else if (highestHonor.stripe2) currentRank = "二劃 (Corporal)";
  else if (highestHonor.stripe1) currentRank = "一劃 (Lance Corporal)";

  const requiredBadges = { target: "", ce1: "", ce2: "", ce3: "", drill1: "", drill2: "", drill3: "" };
  const reqSheet = ss.getSheetByName("必修獎章");
  if (reqSheet) {
    const reqData = reqSheet.getDataRange().getValues();
    for (let r = 0; r < reqData.length; r++) {
      if (String(reqData[r][1] || "").trim().toUpperCase() === targetId) {
        requiredBadges.target = cleanCell(reqData[r][3]);
        requiredBadges.ce1 = cleanCell(reqData[r][4]);
        requiredBadges.ce2 = cleanCell(reqData[r][5]);
        requiredBadges.ce3 = cleanCell(reqData[r][6]);
        requiredBadges.drill1 = cleanCell(reqData[r][7]);
        requiredBadges.drill2 = cleanCell(reqData[r][8]);
        requiredBadges.drill3 = cleanCell(reqData[r][9]);
        break;
      }
    }
  }

  const groupAItems = [];
  const gaSheet = ss.getSheetByName("甲組獎章");
  if (gaSheet) {
    const gaData = gaSheet.getDataRange().getValues();
    const gaNames = gaData[3];
    const gaLevels = gaData[5];
    let memberRow = null;
    for (let r = 6; r < gaData.length; r++) {
      if (String(gaData[r][1] || "").trim().toUpperCase() === targetId) {
        memberRow = gaData[r];
        break;
      }
    }
    let currentBadge = "";
    for (let c = 3; c < gaNames.length; c++) {
      if (gaNames[c] && cleanCell(gaNames[c])) currentBadge = cleanCell(gaNames[c]);
      const lvl = cleanCell(gaLevels[c]) || "一級";
      const val = memberRow ? cleanCell(memberRow[c]) : "";
      if (currentBadge) {
        groupAItems.push({ colIndex: c, name: currentBadge, level: lvl, val: val });
      }
    }
  }

  const groupBItems = [];
  const gbSheet = ss.getSheetByName("乙組獎章");
  if (gbSheet) {
    const gbData = gbSheet.getDataRange().getValues();
    const gbNames = gbData[3];
    const gbLevels = gbData[5];
    let memberRow = null;
    for (let r = 6; r < gbData.length; r++) {

      if (String(gbData[r][2] || "").trim().toUpperCase() === targetId || String(gbData[r][1] || "").trim().toUpperCase() === targetId) {
        memberRow = gbData[r];
        break;
      }
    }
    let currentBadge = "";
    for (let c = 4; c < gbNames.length; c++) {
      if (gbNames[c] && cleanCell(gbNames[c])) currentBadge = cleanCell(gbNames[c]);
      const lvl = cleanCell(gbLevels[c]) || "一級";
      const val = memberRow ? cleanCell(memberRow[c]) : "";
      if (currentBadge) {
        groupBItems.push({ colIndex: c, name: currentBadge, level: lvl, val: val });
      }
    }
  }

  const sportsItems = [];
  const spSheet = ss.getSheetByName("運動員布章");
  if (spSheet) {
    const spData = spSheet.getDataRange().getValues();
    const spNames = spData[4];
    let memberRow = null;
    for (let r = 5; r < spData.length; r++) {
      if (String(spData[r][1] || "").trim().toUpperCase() === targetId) {
        memberRow = spData[r];
        break;
      }
    }
    for (let c = 3; c <= 27; c++) {
      if (spNames[c] && cleanCell(spNames[c])) {
        sportsItems.push({
          colIndex: c,
          item: cleanCell(spNames[c]),
          val: memberRow ? cleanCell(memberRow[c]) : ""
        });
      }
    }
  }

  let progression = null;
  const progSheet = ss.getSheetByName("獎章Progression");
  if (progSheet) {
    const progData = progSheet.getDataRange().getValues();
    for (let r = 1; r < progData.length; r++) {
      if (String(progData[r][1] || "").trim().toUpperCase() === targetId) {
        progression = {
          groupA_Total: cleanCell(progData[r][6]),
          groupB_Total: cleanCell(progData[r][10]),
          whiteCordReq1: cleanCell(progData[r][11]),
          whiteCordReq2: cleanCell(progData[r][12]),
          whiteCordFinal: cleanCell(progData[r][13]),
          honorReq1: cleanCell(progData[r][14]),
          honorReq2: cleanCell(progData[r][15]),
          honorFinal: cleanCell(progData[r][16])
        };
        break;
      }
    }
  }

  return {
    success: true,
    data: {
      memberId: targetId,
      name: memberName,
      profile: profile,
      currentRank: currentRank,
      highestHonor: highestHonor,
      requiredBadges: requiredBadges,
      groupAItems: groupAItems,
      groupBItems: groupBItems,
      sportsItems: sportsItems,
      progression: progression
    }
  };
}

// 導師編輯儲存
function saveAllMemberData(adminPassword, payload) {
  if (!verifyAdmin(adminPassword)) {
    return { success: false, message: "管理密碼不正確，拒絕寫入！" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetId = String(payload.memberId).trim().toUpperCase();
  let changedLogSummary = [];

  const honorSheet = ss.getSheetByName("最高榮譽獎章");
  if (honorSheet && payload.highestHonor) {
    const data = honorSheet.getDataRange().getValues();
    for (let r = 6; r < data.length; r++) {
      if (String(data[r][1] || "").trim().toUpperCase() === targetId) {
        const hh = payload.highestHonor;
        const rowVals = [
          [
            hh.juniorGold || "",
            hh.bncoStatus || "",
            hh.bncoCert || "",
            hh.ancoStatus || "",
            hh.ancoCert || "",
            hh.stripe1 || "",
            hh.stripe2 || "",
            hh.stripe3 || "",
            hh.stripe4 || "",
            hh.founderBadge || "",
            hh.presidentBadge || ""
          ]
        ];
        honorSheet.getRange(r + 1, 4, 1, 11).setValues(rowVals);
        changedLogSummary.push("更新最高榮譽/軍階");
        break;
      }
    }
  }

  const reqSheet = ss.getSheetByName("必修獎章");
  if (reqSheet && payload.requiredBadges) {
    const data = reqSheet.getDataRange().getValues();
    for (let r = 7; r < data.length; r++) {
      if (String(data[r][1] || "").trim().toUpperCase() === targetId) {
        const rb = payload.requiredBadges;
        const rowVals = [
          [
            rb.target || "",
            rb.ce1 || "",
            rb.ce2 || "",
            rb.ce3 || "",
            rb.drill1 || "",
            rb.drill2 || "",
            rb.drill3 || ""
          ]
        ];
        reqSheet.getRange(r + 1, 4, 1, 7).setValues(rowVals);
        changedLogSummary.push("更新必修獎章");
        break;
      }
    }
  }

  const gaSheet = ss.getSheetByName("甲組獎章");
  if (gaSheet && payload.groupAUpdates) {
    const data = gaSheet.getDataRange().getValues();
    let targetRow = -1;
    for (let r = 6; r < data.length; r++) {
      if (String(data[r][1] || "").trim().toUpperCase() === targetId) {
        targetRow = r + 1;
        break;
      }
    }
    if (targetRow !== -1) {
      payload.groupAUpdates.forEach(up => {
        gaSheet.getRange(targetRow, up.colIndex + 1).setValue(up.val || "");
      });
      changedLogSummary.push("更新甲組專章");
    }
  }

  const gbSheet = ss.getSheetByName("乙組獎章");
  if (gbSheet && payload.groupBUpdates) {
    const data = gbSheet.getDataRange().getValues();
    let targetRow = -1;
    for (let r = 6; r < data.length; r++) {
      if (String(data[r][2] || "").trim().toUpperCase() === targetId || String(data[r][1] || "").trim().toUpperCase() === targetId) {
        targetRow = r + 1;
        break;
      }
    }
    if (targetRow !== -1) {
      payload.groupBUpdates.forEach(up => {
        gbSheet.getRange(targetRow, up.colIndex + 1).setValue(up.val || "");
      });
      changedLogSummary.push("更新乙組專章");
    }
  }

  const spSheet = ss.getSheetByName("運動員布章");
  if (spSheet && payload.sportsUpdates) {
    const data = spSheet.getDataRange().getValues();
    let targetRow = -1;
    for (let r = 5; r < data.length; r++) {
      if (String(data[r][1] || "").trim().toUpperCase() === targetId) {
        targetRow = r + 1;
        break;
      }
    }
    if (targetRow !== -1) {
      payload.sportsUpdates.forEach(up => {
        spSheet.getRange(targetRow, up.colIndex + 1).setValue(up.val || "");
      });
      changedLogSummary.push("更新運動員布章");
    }
  }

  SpreadsheetApp.flush();
  writeAuditLog("隊員檔案更新", payload.name + " (" + targetId + ")", changedLogSummary.join("、"));

  return {
    success: true,
    message: "隊員【" + payload.name + " (" + targetId + ")】之全部資料已即時同步至試算表！"
  };
}

function getAllMembersRoster(adminPassword) {
  if (!verifyAdmin(adminPassword)) {
    return { success: false, message: "無權限存取花名冊" };
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("最高榮譽獎章");
  if (!sheet) return { success: false, message: "找不到工作表" };
  
  const data = sheet.getDataRange().getValues();
  const roster = [];
  for (let r = 6; r < data.length; r++) {
    const id = cleanCell(data[r][1]);
    const name = cleanCell(data[r][2]);
    if (id && name) {
      let rank = "隊員";
      if (cleanCell(data[r][11])) rank = "四劃 (SSgt)";
      else if (cleanCell(data[r][10])) rank = "三劃 (Sgt)";
      else if (cleanCell(data[r][9])) rank = "二劃 (Cpl)";
      else if (cleanCell(data[r][8])) rank = "一劃 (LCpl)";
      
      roster.push({
        num: cleanCell(data[r][0]) || (r - 5),
        id: id,
        name: name,
        rank: rank,
        bnco: cleanCell(data[r][4]) || (cleanCell(data[r][5]) ? "已合格" : "-"),
        founder: cleanCell(data[r][12]) || "-",
        president: cleanCell(data[r][13]) || "-"
      });
    }
  }
  return { success: true, roster: roster };
}