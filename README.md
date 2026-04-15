# Premium POS System

A feature-rich, standalone Point of Sale (POS) and inventory management system designed for shops, built with HTML, CSS, and vanilla JavaScript.

## Features
- **Dashboard** with Quick Actions (New Invoice, Daily Summary, Backup & Restore)
- **Point of Sale** module to generate and print invoices 
- **Inventory Management** (Goods Received Notes)
- **Accounts Payable & Receivable** management
- **Comprehensive Reporting** (Profit & Loss, Tax Liability, etc.)
- **Auto-save** to Local Storage
- **Data Portability** via Backup and Restore feature

## How to Install
There is no complex backend installation or database setup required. 
1. Download or clone this project folder to your local machine.
2. Ensure you have the file structure intact (`index.html`, `script.js`, `style.css`).

## How to Run
- **Quick Method (Windows):** Simply double-click the `run.bat` file in the main folder to launch the system instantly in your default browser.
- **Manual Method:** Open the `index.html` file directly in any modern web browser (e.g., Chrome, Edge, Firefox, Safari).

## Default Login Credentials
- **Username:** `admin`
- **Password:** `admin`

*(You can manage users and their roles under the Settings tabs once logged in).*

## Database & Storage
All your data is saved persistently within your browser's local storage (`pos-db`). To prevent data loss when clearing browser history or switching devices, please regularly use the **Backup & Restore** feature on the dashboard to safely export and import your database!
