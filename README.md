# 香港基督少年軍第82分隊中級組隊員獎章數位履歷與管理系統
# The Boys' Brigade, Hong Kong (82nd Company) - Junior Section Badges Dossier & Management Portal

> 🌐 **線上系統入口 / Live Portal Link**：  
> 👉 [點擊進入：第82分隊中級組獎章數位系統入口](https://tinyurl.com/bb82badges)

[![Live Demo](https://img.shields.io/badge/線上入口-點擊進入-success?style=for-the-badge&logo=googlechrome&logoColor=white)](https://tinyurl.com/bb82badges)

[![Google Apps Script](https://img.shields.io/badge/Runtime-Google%20Apps%20Script%20(V8)-4285F4?logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Bootstrap 5](https://img.shields.io/badge/Frontend-Bootstrap%205.3-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![License: Internal Use](https://img.shields.io/badge/License-Internal%20BBHK%20Use-0e2a47.svg)](#license)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-Yes-success.svg)](#)

---

## 📑 目錄 / Table of Contents
- [中文版說明 (Traditional Chinese)](#-繁體中文說明)
  - [系統簡介](#系統簡介)
  - [核心亮點功能](#核心亮點功能)
  - [全表工作簿對齊結構](#全表工作簿對齊結構)
  - [快速部署指引](#快速部署指引)
  - [權限與預設憑據](#權限與預設憑據)
- [English Documentation](#-english-documentation)
  - [Introduction](#introduction)
  - [Core Features](#core-features)
  - [Workbook Architecture](#workbook-architecture)
  - [Deployment Guide](#deployment-guide)
  - [Credentials & Security](#credentials--security)
- [版本歷史 / Changelog](#-版本歷史--changelog)

---

## 🇭🇰 繁體中文說明

### 系統簡介
本系統專為**香港基督少年軍第82分隊**中級組量身打造，將 Google 試算表（Google Sheets）原本龐雜的多工作表考核數據，轉化為具備現代響應式設計的 Web App 門戶。

系統實現了**隊員免密碼快速查詢個人數位履歷**與**導師全功能後台雙向即時寫入**。採用無伺服器架構（Serverless），無需外部資料庫，所有數據皆即時直接同步存取自分隊官方試算表。

### 核心亮點功能

#### 1. 隊員端：全方位個人數位獎章履歷（Badges Dossier）
* **極簡免密碼查詢**：隊員或家長只需輸入隊員證編號（如 `82-335C`、`82-265C`），即可即時檢視個人完整進度。
* **分隊年資與個人資料**：展示入隊年份、年資、中級組年資及活躍隊員狀態（Active Status）。
* **全獎章項目覆蓋（100% 完整呈現）**：
  * **最高榮譽與軍階**：初級組服務金獎、BNCO / ANCO 幹部訓練（考核合格與證書字號雙欄位獨立解析）、一劃至四劃軍階徽章、創辦人章及會長章。
  * **必修獎章（7項）**：目標章 (Target)、基督教教育章（一、二、三級）、步操章（一、二、三級）。
  * **甲組專門專章（14類全部涵蓋）**：急救、工藝、樂員、通訊、環境保護、興趣、國際知識、自然、安全、社會服務等。
  * **乙組專門專章（10+類）**：遠足、露營、獨木舟、飛行探知、體能、拯溺、風帆、海員等。
  * **運動員布章（25個單項完整支援）**：射藝、羽毛球、足球、籃球、攀爬、野外定向、躲避盤、閃避球等。
* **晉升與資格審核引擎**：系統依據現有專章總數，自動即時計算白肩索（White Cord）與榮譽章（Badge of Honor）資格進度。
* **一鍵排版列印（Print Ready）**：內建專屬 `@media print` 樣式，點擊「列印檔案」即可產生乾淨無按鈕的個人紙本或 PDF 存檔。

#### 2. 導師端：全能管理控制中心（Officer Admin Center）
* **密碼身分驗證**：進入管理後台或執行重要操作皆需驗證導師管理密碼（預設：`BB82Badges`）。
* **自主變更管理密碼**：導師可隨時於後台更改登入密碼，利用 Google 腳本雲端屬性庫（`PropertiesService`）安全儲存並即時生效。
* **隊員端「就地即時編輯」（Instant In-Place Edit）**：
  * 導師在隊員個人查詢頁面可點擊「🔑 即時編輯此隊員」，輸入密碼後直接彈出編輯視窗。
  * 採用**獨立 Scoped Inline-Style 切換引擎**，保證 5 個 Tab 標籤頁（最高榮譽、必修、甲組、乙組、布章）切換 100% 順暢穩定。
  * 編輯完成後儲存，系統會自動在背景即時重載隊員頁面，無需切換回後台。
* **分隊花名冊與 CSV 匯出（Roster & CSV Export）**：後台提供全體隊員名冊清單，支援模糊搜尋編號、姓名與軍階，並可一鍵匯出 CSV 檔供分隊行政備份。
* **開立新隊員檔案（Smart Profile Onboarding）**：
  * 系統自動比對既有號碼，推算並建議下一個隊員證編號（如 `82-344C`）。
  * **安全單元格定位插行技術**：全表同步寫入《最高榮譽》、《總表》、《必修》、《甲組》、《乙組》、《布章》、《Progression》等全部 7 個工作表，避開底部總數計算公式列，100% 保證同步率。
* **徹底刪除隊員檔案（Profile Purge）**：支援從所有分頁中徹底抹除退隊人員，防止殘留廢棄資料。
* **系統修改日誌（Audit Log Trail）**：任何開立、修改、刪除動作皆會自動寫入試算表《系統修改日誌》分頁，詳細記載時間戳記、操作類別、對象隊員與異動細節，並可在後台即時調閱最近 80 筆紀錄。

---

### 全表工作簿對齊結構

| 工作表名稱 | 欄位作用 / 包含內容 | 索引鍵 (Key Column) |
| :--- | :--- | :---: |
| `最高榮譽獎章` | 幹部訓練 (BNCO / ANCO 狀態與證書號)、一劃至四劃、創辦人章、會長章 | B 欄 (`Col 2`) |
| `獎章總表` | 隊員活躍狀態 (P)、入隊年份、年資、中級組年資 | B 欄 (`Col 2`) |
| `必修獎章` | 目標章 (Target)、基督教教育章 (1-3級)、步操章 (1-3級) | B 欄 (`Col 2`) |
| `甲組獎章` | 急救、工藝、樂員、通訊、環保、興趣、自然、安全等 14 類專章 | B 欄 (`Col 2`) |
| `乙組獎章` | 遠足、露營、獨木舟、飛行探知、體能、拯溺、風帆、海員等專章 | C 欄 (`Col 3`) |
| `運動員布章` | 25 項單項運動員布章考獲字號與狀態 | B 欄 (`Col 2`) |
| `獎章Progression` | 甲組/乙組統計、白肩索與榮譽章合格計算 | B 欄 (`Col 2`) |
| `系統修改日誌` | 自動生成的審計日誌 (紀錄時間、操作類型、對象隊員、變更內容) | A-D 欄 |

---

### 快速部署指引

1. **開啟 Apps Script 編輯器**：在 Google 試算表上方選單點擊「擴充功能 (Extensions)」➔「Apps Script」。
2. **貼入原始碼**：
   * 將本專案的 `Code.gs` 完整貼入後端。
   * 新增一個 HTML 檔案並命名為 `Index`，貼入 `Index.html`。
3. **發布為 Web 應用程式 (Web App)**：
   * 點選右上角「部署 (Deploy)」➔「新增部署作業 (New deployment)」。
   * 類型選擇「網頁應用程式 (Web App)」。
   * **執行身分 (Execute as)**：選擇 `我 (Me)`。
   * **誰可以存取 (Who has access)**：選擇 `所有人 (Anyone)`（隊員免登入 Google 帳號即可查詢）。
4. **授權並啟用**：完成 Google 帳號安全審查與權限允許，即可獲得正式網頁網址。

---

### 權限與預設憑據

* **隊員查詢通道**：無需密碼（輸入如 `82-335C` 隊員編號即可）。
* **預設導師管理密碼**：`BB82Badges`（首次登入後可於後台「修改密碼」變更）。

---

## 🇬🇧 English Documentation

### Introduction
The **BB82 Junior Section Badges Dossier & Management Portal** is a production-grade web portal custom-built for **The Boys' Brigade, Hong Kong (82nd Company)**. It turns complex, multi-tabbed Google Sheets records into a sleek, real-time web application.

Designed with a serverless architecture powered by Google Apps Script (GAS) and Bootstrap 5, it requires zero database setup and synchronizes directly with the official Google Spreadsheet.

### Core Features

#### 1. Squad Member Digital Dossier (Public Query)
* **Frictionless ID Lookup**: Squad members and parents can access comprehensive progress records simply by typing their Member ID (e.g., `82-335C`).
* **Complete Record Representation**:
  * **Highest Honors & Ranks**: Junior Gold, BNCO & ANCO (with separate fields for completion status and certificate numbers), Lance Corporal (1 Stripe) through Staff Sergeant (4 Stripes), Founder's Badge, and President's Badge.
  * **Compulsory Badges**: Target Badge, Christian Education (Levels 1–3), and Drill (Levels 1–3).
  * **Group A Badges**: First Aid, Handcraft, Musician, Communications, Environmental Protection, Hobbies, Naturalist, Safety, Community Service, etc. (All 14 categories).
  * **Group B Badges**: Hiking, Camping, Canoeing, Aviation, Physical, Lifesaving, Sailing, Seamanship, etc.
  * **Sports Cloth Badges**: Full support across all 25 individual sports items (Dodgebee, Football, Swimming, etc.).
* **Progression Audit Engine**: Automatically evaluates qualified items against official requirements for the **White Cord** and the **Badge of Honor**.
* **Print-Optimized**: Native `@media print` rules ensure clean, distraction-free hardcopy or PDF generation.

#### 2. Officer Administration Center
* **Security & Credential Management**: Protected with an officer access key (Default: `BB82Badges`).
* **Custom Password Engine**: Admins can update the password on the fly, stored securely within GAS `PropertiesService`.
* **Instant In-Place Editor**:
  * Allows officers to inspect a member's dossier and immediately edit details via **"Edit Member"**.
  * Built on an **isolated Scoped Inline-Style Tab engine** that completely eliminates tab-switching failures inside dialogs.
  * Auto-refreshes member views immediately upon saving.
* **Squad Roster & CSV Export**: Provides a comprehensive member directory with real-time text filtering and one-click CSV report downloads.
* **Robust Member Onboarding**:
  * Automatically calculates and recommends the next sequential Member ID (e.g., `82-344C`).
  * **Safe Cell-Level Insertion**: Safely inserts records across all 7 workbook sheets while avoiding bottom formula rows.
* **Profile Deletion Engine**: Safely purges retired squad profiles across all workbook tabs with safety prompts.
* **Audit Trail**: Every transaction is logged into the `系統修改日誌` (Audit Log) tab with timestamp, action type, target squad member, and a change summary.

---

### Workbook Architecture

```text
├── Code.gs             # Backend logic, sheet indexing, safe insertion & sync APIs
├── Index.html          # Web application UI, Scoped Tab Engine, modal controllers
├── appsscript.json     # Manifest file with execution runtime configuration
└── README.md           # Bilingual project documentation
