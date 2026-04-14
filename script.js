document.addEventListener('DOMContentLoaded', () => {
    // === Theme Management ===
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;

    // Load saved theme or check system preference
    const savedTheme = localStorage.getItem('pos-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        root.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        root.setAttribute('data-theme', 'dark');
    }

    // Toggle event
    themeToggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('pos-theme', newTheme);
    });

    // === View Management & Login ===
    const loginForm = document.getElementById('login-form');
    const loginView = document.getElementById('login-view');
    const menuView = document.getElementById('menu-view');
    const logoutBtn = document.getElementById('logout-btn');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const loginBtn = document.querySelector('.login-btn');
        const originalContent = loginBtn.innerHTML;
        loginBtn.innerHTML = '<span>Authenticating...</span><svg class="btn-icon" style="animation: spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>';
        loginBtn.style.opacity = '0.9';

        // Add spin animation to document implicitly or directly inline
        const style = document.createElement('style');
        style.innerHTML = '@keyframes spin { 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);

        setTimeout(() => {
            loginBtn.innerHTML = originalContent;
            loginBtn.style.opacity = '1';

            // Switch views
            loginView.classList.remove('active');
            setTimeout(() => {
                menuView.classList.add('active');
            }, 500);
        }, 1200);
    });

    logoutBtn.addEventListener('click', () => {
        menuView.classList.remove('active');
        setTimeout(() => {
            loginView.classList.add('active');
            loginForm.reset();
        }, 500);
    });

    // === Tree Navigation ===
    const treeNodes = document.querySelectorAll('.tree-node');

    treeNodes.forEach(node => {
        const content = node.querySelector('.tree-content');

        content.addEventListener('click', (e) => {
            e.stopPropagation();

            const childrenContainer = node.querySelector('.tree-children');
            if (childrenContainer) {
                node.classList.toggle('expanded');
            } else {
                document.querySelectorAll('.tree-node.active').forEach(activeNode => {
                    activeNode.classList.remove('active');
                });
                node.classList.add('active');
            }
        });
    });

    // === Simple Search ===
    const searchBar = document.querySelector('.search-bar');
    searchBar.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const leaves = document.querySelectorAll('.tree-children .tree-node:not(:has(.tree-children))');

        leaves.forEach(leaf => {
            const title = leaf.querySelector('.tree-title').innerText.toLowerCase();
            if (title.includes(query)) {
                leaf.style.display = 'flex';
                // optionally expand parent
            } else {
                leaf.style.display = 'none';
            }
        });
    });
});

// === Invoice View Logic ===

// === Global Mock Database ===
const mockDB = {
    debtors: [
        { id: 1, name: 'Acme Corp', address: '123 Main St', phoneNo: '555-0100', taxRegistered: true, creditPeriod: 30, isUsed: true },
        { id: 2, name: 'John Doe', address: '456 Side St', phoneNo: '555-0200', taxRegistered: false, creditPeriod: 15, isUsed: false }
    ],
    creditors: [
        { id: 1, name: 'Global Supply', address: '789 Ind Ave', phoneNo: '555-0300', taxRegistered: true, creditPeriod: 45, isUsed: true },
        { id: 2, name: 'Local Parts', address: '321 Town Rd', phoneNo: '555-0400', taxRegistered: false, creditPeriod: 14, isUsed: false }
    ],
    items: [
        { id: 1, partNo: 'O-001', name: 'Premium Oil Filter', category: 'Filters', price: 15.50, isUsed: true },
        { id: 2, partNo: 'O-002', name: 'Standard Oil Filter', category: 'Filters', price: 8.50, isUsed: false },
        { id: 3, partNo: 'B-001', name: 'Front Brake Pads', category: 'Brakes', price: 45.00, isUsed: true },
        { id: 4, partNo: 'B-002', name: 'Rear Brake Pads', category: 'Brakes', price: 40.00, isUsed: false },
        { id: 5, partNo: 'S-001', name: 'Iridium Spark Plug', category: 'Ignition', price: 12.00, isUsed: false },
        { id: 6, partNo: 'A-001', name: 'Cabin Air Filter', category: 'Filters', price: 20.00, isUsed: false },
        { id: 7, partNo: 'W-001', name: 'Wiper Blades 22"', category: 'Accessories', price: 18.00, isUsed: false }
    ],
    users: [
        { id: 1, username: 'admin', role: 'Admin', isUsed: true },
        { id: 2, username: 'cashier1', role: 'Cashier', isUsed: false }
    ]
};

// === Invoice Number Generator ===
function generateInvoiceNumber(currentNum) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `INV-${dateStr}-${currentNum.toString().padStart(3, '0')}`;
}

function initInvoiceNumber() {
    let lastInvoiceId = localStorage.getItem('lastInvoiceId');
    if (!lastInvoiceId) {
        lastInvoiceId = 1;
        localStorage.setItem('lastInvoiceId', lastInvoiceId);
    }
    
    const invoiceNumberEl = document.getElementById('invoice-number');
    const invoiceDateEl = document.getElementById('invoice-date');
    
    if (invoiceNumberEl) {
        invoiceNumberEl.innerText = generateInvoiceNumber(parseInt(lastInvoiceId));
    }
    
    if (invoiceDateEl) {
        const now = new Date();
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        invoiceDateEl.innerText = `Date: ${now.toLocaleDateString('en-GB', options)}`;
    }
}

// Initialize on load
initInvoiceNumber();

const dashboardView = document.getElementById('dashboard-view');
const invoiceView = document.getElementById('invoice-view');
const newInvoiceBtn = document.getElementById('new-invoice-btn');
const closeInvoiceBtn = document.getElementById('close-invoice-btn');

// To toggle views
if (newInvoiceBtn && closeInvoiceBtn) {
    // Set initial state based on HTML (invoice is active, dashboard is hidden for demo)
    // If you want dashboard first, reverse this.

    newInvoiceBtn.addEventListener('click', () => {
        dashboardView.classList.remove('active');
        initInvoiceNumber();
        setTimeout(() => { invoiceView.classList.add('active'); }, 300);
    });

    closeInvoiceBtn.addEventListener('click', () => {
        invoiceView.classList.remove('active');
        setTimeout(() => { dashboardView.classList.add('active'); }, 300);
    });
}

// Tax logic based on Customer Selection
const invoiceCustomerSelect = document.getElementById('invoice-customer');
const taxRegisteredCheckbox = document.getElementById('tax-registered-checkbox');
const invoiceTitle = document.getElementById('invoice-title');
const taxRow = document.getElementById('tax-row');
const invoiceTaxDisplay = document.getElementById('invoice-tax');
const invoiceGrandTotal = document.getElementById('invoice-grand-total');
const invoiceSubtotalDisplay = document.getElementById('invoice-subtotal');
const invoiceItemsTable = document.getElementById('invoice-items');
const addItemBtn = document.getElementById('add-item-btn');

let baseSubtotal = 0.00;

function calculateTotals() {
    baseSubtotal = 0;
    if (!invoiceItemsTable) return;
    const rows = invoiceItemsTable.querySelectorAll('tr');

    rows.forEach(row => {
        const qtyInput = row.querySelector('.item-qty');
        const priceInput = row.querySelector('.item-price');
        const totalDisplay = row.querySelector('.item-total');

        const qty = parseFloat(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const rowTotal = qty * price;

        totalDisplay.innerText = rowTotal.toFixed(2);
        baseSubtotal += rowTotal;
    });

    if (invoiceSubtotalDisplay) {
        invoiceSubtotalDisplay.innerText = baseSubtotal.toFixed(2);
    }
    updateInvoiceDisplay();
}

function updateInvoiceDisplay() {
    if (!taxRegisteredCheckbox) return;
    const isTaxRegistered = taxRegisteredCheckbox.checked;

    if (isTaxRegistered) {
        // Change to Tax Invoice
        invoiceTitle.innerText = "TAX INVOICE";
        invoiceTitle.style.color = "#10B981"; // Emerald green for tax
        taxRow.style.display = "flex";

        const taxAmount = baseSubtotal * 0.18; // 18% tax example
        invoiceTaxDisplay.innerText = taxAmount.toFixed(2);
        invoiceGrandTotal.innerText = (baseSubtotal + taxAmount).toFixed(2);
    } else {
        // Standard Invoice / Receipt
        invoiceTitle.innerText = "Standard Invoice";
        invoiceTitle.style.color = "var(--input-focus)";
        taxRow.style.display = "none";
        invoiceGrandTotal.innerText = baseSubtotal.toFixed(2);
    }
}

if (invoiceCustomerSelect && taxRegisteredCheckbox) {
    // When customer is selected from dropdown
    invoiceCustomerSelect.addEventListener('change', (e) => {
        if (e.target.value === 'tax_reg') {
            taxRegisteredCheckbox.checked = true;
        } else {
            taxRegisteredCheckbox.checked = false;
        }
        updateInvoiceDisplay();
    });

    // When checkbox is toggled manually
    taxRegisteredCheckbox.addEventListener('change', updateInvoiceDisplay);

    const partSearchInput = document.getElementById('part-search-input');
    const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
    const entryQty = document.getElementById('entry-qty');
    const entryPrice = document.getElementById('entry-price');
    const addEntryBtn = document.getElementById('add-entry-btn');

    let selectedPart = null;

    if (partSearchInput) {
        // Search Logic
        partSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            autocompleteDropdown.innerHTML = '';
            selectedPart = null;
            entryQty.disabled = true;
            entryPrice.disabled = true;
            addEntryBtn.disabled = true;

            if (query.length === 0) {
                autocompleteDropdown.style.display = 'none';
                return;
            }

            const matches = mockDB.items.filter(part => 
                part.name.toLowerCase().includes(query) || 
                part.partNo.toLowerCase().includes(query)
            );

            if (matches.length > 0) {
                autocompleteDropdown.style.display = 'block';
                matches.forEach(part => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    item.innerHTML = `
                        <span class="dropdown-item-title">${part.name}</span>
                        <span class="dropdown-item-desc">${part.partNo}</span>
                    `;
                    item.addEventListener('click', () => {
                        selectPart(part);
                    });
                    autocompleteDropdown.appendChild(item);
                });
            } else {
                autocompleteDropdown.style.display = 'none';
            }
        });

        // Hide dropdown on click outside
        document.addEventListener('click', (e) => {
            if (e.target !== partSearchInput) {
                autocompleteDropdown.style.display = 'none';
            }
        });

        function selectPart(part) {
            selectedPart = part;
            partSearchInput.value = part.name;
            entryPrice.value = (parseFloat(part.price) || 0).toFixed(2);
            entryQty.value = 1;
            
            entryQty.disabled = false;
            entryPrice.disabled = false;
            addEntryBtn.disabled = false;
            
            autocompleteDropdown.style.display = 'none';
            entryQty.focus();
        }

        function addCurrentEntry() {
            if (!selectedPart) return;
            const qty = parseInt(entryQty.value) || 1;
            const price = parseFloat(entryPrice.value) || selectedPart.price;
            
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${selectedPart.partNo}</td>
                <td>${selectedPart.name}</td>
                <td><input type="number" class="item-qty glass-input num-input" value="${qty}" min="1" style="width:100%; text-align:center;"></td>
                <td><input type="number" class="item-price glass-input num-input" value="${price.toFixed(2)}" step="0.01" style="width:100%; text-align:center;"></td>
                <td class="item-total">${(qty * price).toFixed(2)}</td>
                <td><button class="action-btn text-danger remove-item-btn">×</button></td>
            `;
            invoiceItemsTable.appendChild(newRow);
            
            // Reset fields
            partSearchInput.value = '';
            entryQty.value = '';
            entryPrice.value = '';
            entryQty.disabled = true;
            entryPrice.disabled = true;
            addEntryBtn.disabled = true;
            selectedPart = null;
            partSearchInput.focus();
            
            calculateTotals();
        }

        addEntryBtn.addEventListener('click', addCurrentEntry);

        // Enter key to add
        [partSearchInput, entryQty, entryPrice].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (selectedPart) {
                        addCurrentEntry();
                    } else if (input === partSearchInput && autocompleteDropdown.children.length > 0) {
                        // If pressing enter on search and there's a match, pick the first one
                        autocompleteDropdown.children[0].click();
                    }
                }
            });
        });
    }

    // Table Event Delegation for inputs and remove buttons
    if (invoiceItemsTable) {
        invoiceItemsTable.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-price')) {
                calculateTotals();
            }
        });

        invoiceItemsTable.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-btn')) {
                e.target.closest('tr').remove();
                calculateTotals();
            }
        });
    }

    // Initialize state
    calculateTotals();

    // Print Invoice Logic
    const printBtn = document.getElementById('print-invoice-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
            
            // Increment the invoice number after printing to ensure it's a unique primary key
            let lastInvoiceId = parseInt(localStorage.getItem('lastInvoiceId') || '1');
            lastInvoiceId++;
            localStorage.setItem('lastInvoiceId', lastInvoiceId);
            
            // Re-initialize for the next invoice
            initInvoiceNumber();
            
            // Reset the invoice table and totals
            if (invoiceItemsTable) {
                invoiceItemsTable.innerHTML = '';
                calculateTotals();
            }
        });
    }
}

// === Management (CRUD) Logic ===

const settingsBtn = document.getElementById('settings-btn');
const managementView = document.getElementById('management-view');
const closeMgmtBtn = document.getElementById('close-mgmt-btn');
const mgmtTabs = document.querySelectorAll('.mgmt-tab');
const mgmtTitle = document.getElementById('mgmt-title');
const mgmtInputsContainer = document.getElementById('mgmt-inputs-container');
const mgmtTableHeader = document.getElementById('mgmt-table-header');
const mgmtTableBody = document.getElementById('mgmt-table-body');
const mgmtForm = document.getElementById('mgmt-form');
const mgmtIdInput = document.getElementById('mgmt-id');
const mgmtCancelEdit = document.getElementById('mgmt-cancel-edit');
const mgmtFormTitle = document.getElementById('mgmt-form-title');

let activeTab = 'debtors';

const schemas = {
    debtors: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'address', label: 'Address', type: 'text', required: true },
        { key: 'phoneNo', label: 'Phone No', type: 'text', required: true },
        { key: 'taxRegistered', label: 'Tax Registered (Yes/No)', type: 'checkbox', required: false },
        { key: 'creditPeriod', label: 'Credit Period (Days)', type: 'number', required: true }
    ],
    creditors: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'address', label: 'Address', type: 'text', required: true },
        { key: 'phoneNo', label: 'Phone No', type: 'text', required: true },
        { key: 'taxRegistered', label: 'Tax Registered (Yes/No)', type: 'checkbox', required: false },
        { key: 'creditPeriod', label: 'Credit Period (Days)', type: 'number', required: true }
    ],
    items: [
        { key: 'partNo', label: 'Part No', type: 'text', required: true },
        { key: 'name', label: 'Item Name', type: 'text', required: true },
        { key: 'category', label: 'Category', type: 'text', required: false },
        { key: 'price', label: 'Price (optional)', type: 'number', required: false }
    ],
    users: [
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'role', label: 'Role', type: 'text', required: true }
    ]
};

const crudModalWrapper = document.getElementById('crud-modal-wrapper');
const crudModalClose = document.getElementById('crud-modal-close');
const mgmtOpenAddBtn = document.getElementById('mgmt-open-add-btn');

const addProductBtn = document.getElementById('add-product-btn');

if (settingsBtn && managementView) {
    settingsBtn.addEventListener('click', () => {
        document.querySelector('.content-view.active')?.classList.remove('active');
        managementView.classList.add('active');
        renderMgmtView();
    });
    
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            document.querySelector('.content-view.active')?.classList.remove('active');
            managementView.classList.add('active');
            
            // Switch to Items tab
            mgmtTabs.forEach(t => t.classList.remove('active'));
            const itemsTab = Array.from(mgmtTabs).find(t => t.dataset.tab === 'items');
            if (itemsTab) itemsTab.classList.add('active');
            
            activeTab = 'items';
            resetMgmtForm();
            renderMgmtView();
            
            // Automatically pop open the Add New modal
            setTimeout(() => {
                if (crudModalWrapper) crudModalWrapper.style.display = 'flex';
            }, 50);
        });
    }

    closeMgmtBtn.addEventListener('click', () => {
        managementView.classList.remove('active');
        document.getElementById('dashboard-view').classList.add('active');
    });

    mgmtTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            mgmtTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.dataset.tab;
            resetMgmtForm();
            renderMgmtView();
        });
    });

    mgmtCancelEdit.addEventListener('click', resetMgmtForm);
    crudModalClose.addEventListener('click', resetMgmtForm);
    
    if (mgmtOpenAddBtn) {
        mgmtOpenAddBtn.addEventListener('click', () => {
            resetMgmtForm();
            crudModalWrapper.style.display = 'flex';
        });
    }

    mgmtForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = mgmtIdInput.value;
        const schema = schemas[activeTab];
        let record = { id: id ? parseInt(id) : Date.now(), isUsed: false };

        schema.forEach(field => {
            const input = document.getElementById(`mgmt-${field.key}`);
            if (field.type === 'checkbox') {
                record[field.key] = input.checked;
            } else if (field.type === 'number') {
                const val = parseFloat(input.value);
                record[field.key] = isNaN(val) ? '' : val;
            } else {
                record[field.key] = input.value;
            }
        });

        if (id) {
            // Edit
            const index = mockDB[activeTab].findIndex(item => item.id == id);
            if (index > -1) {
                record.isUsed = mockDB[activeTab][index].isUsed; // preserve isUsed
                mockDB[activeTab][index] = record;
            }
        } else {
            // Add
            mockDB[activeTab].push(record);
        }

        resetMgmtForm();
        renderMgmtView();
    });
}

function renderMgmtView() {
    mgmtTitle.innerText = `Manage ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`;
    const schema = schemas[activeTab];

    // Build Inputs inside modal
    mgmtInputsContainer.innerHTML = schema.map(field => {
        if (field.type === 'checkbox') {
             return `<label style="display:flex; align-items:center; gap: 10px; color: var(--text-secondary); cursor: pointer; height: 100%;">
                        <input type="checkbox" id="mgmt-${field.key}" style="width: 20px; height: 20px;">
                        <span>${field.label}</span>
                     </label>`;
        }
        return `
        <div class="input-group">
            <label>${field.label}</label>
            <input type="${field.type}" id="mgmt-${field.key}" class="glass-input" ${field.required ? 'required' : ''} ${field.type === 'number' ? 'step="any"' : ''} style="height: 48px;">
        </div>
        `;
    }).join('');

    // Build Table Header
    mgmtTableHeader.innerHTML = schema.map(field => `<th>${field.label}</th>`).join('') + '<th width="120">Actions</th>';

    // Build Table Body
    const data = mockDB[activeTab];
    mgmtTableBody.innerHTML = data.map(item => `
        <tr>
            ${schema.map(field => {
                let displayVal = item[field.key];
                if (field.type === 'checkbox') displayVal = displayVal ? 'Yes' : 'No';
                if (displayVal === null || displayVal === undefined) displayVal = '';
                return `<td>${displayVal}</td>`;
            }).join('')}
            <td>
                <button class="action-btn mgmt-edit-btn" data-id="${item.id}" style="display:inline-block; margin-right: 5px; opacity:1; color: var(--input-focus);">Edit</button>
                <button class="action-btn text-danger mgmt-del-btn" data-id="${item.id}" style="display:inline-block; opacity:1;" ${item.isUsed ? 'disabled title="Cannot delete, item is in use"' : ''}>${item.isUsed ? '🔒' : '×'}</button>
            </td>
        </tr>
    `).join('');

    // Attach Edit/Delete Listeners
    document.querySelectorAll('.mgmt-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const record = mockDB[activeTab].find(item => item.id == id);
            mgmtIdInput.value = record.id;
            schema.forEach(field => {
                const el = document.getElementById(`mgmt-${field.key}`);
                if (field.type === 'checkbox') {
                    el.checked = record[field.key];
                } else {
                    el.value = record[field.key] !== null ? record[field.key] : '';
                }
            });
            mgmtFormTitle.innerText = 'Edit Record';
            crudModalWrapper.style.display = 'flex';
        });
    });

    document.querySelectorAll('.mgmt-del-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const record = mockDB[activeTab].find(item => item.id == id);
            
            if (record.isUsed) {
                alert("Cannot delete this record because it is currently in use.");
                return;
            }

            if (confirm("Are you sure you want to delete this record?")) {
                mockDB[activeTab] = mockDB[activeTab].filter(item => item.id != id);
                renderMgmtView();
            }
        });
    });
}

function resetMgmtForm() {
    mgmtForm.reset();
    mgmtIdInput.value = '';
    mgmtFormTitle.innerText = 'Add New';
    if (crudModalWrapper) crudModalWrapper.style.display = 'none';
}

// === Report View Logic ===
const reportView = document.getElementById('report-view');
const reportTitle = document.getElementById('report-title');
const reportTableHeader = document.getElementById('report-table-header');
const reportTableBody = document.getElementById('report-table-body');
const closeReportBtn = document.getElementById('close-report-btn');
const printReportBtn = document.getElementById('print-report-btn');

if (closeReportBtn && reportView) {
    closeReportBtn.addEventListener('click', () => {
        reportView.classList.remove('active');
        document.getElementById('dashboard-view').classList.add('active');
    });
}

if (printReportBtn) {
    printReportBtn.addEventListener('click', () => {
        window.print();
    });
}

const mockReports = {
    periodic_sales: {
        title: "Periodic Sales Report",
        headers: ["Date", "Invoice No", "Customer", "Total Amount"],
        data: [
            ["01 Apr 2026", "INV-20260401-001", "Acme Corp", "$150.00"],
            ["02 Apr 2026", "INV-20260402-002", "John Doe", "$45.50"],
            ["05 Apr 2026", "INV-20260405-003", "Walk-in", "$12.00"]
        ]
    },
    tax_liability: {
        title: "Tax Liability Report",
        headers: ["Date", "Invoice No", "Taxable Amount", "Tax (18%)"],
        data: [
            ["01 Apr 2026", "INV-20260401-001", "$150.00", "$27.00"],
            ["08 Apr 2026", "INV-20260408-004", "$300.00", "$54.00"]
        ]
    },
    ap_supplier: {
        title: "Accounts Payable by Supplier",
        headers: ["Date", "Supplier", "Invoice Ref", "Amount", "Status"],
        data: [
            ["28 Mar 2026", "Global Supply", "GS-9021", "$1,200.00", "Pending"],
            ["10 Apr 2026", "Local Parts", "LP-441", "$340.00", "Pending"]
        ]
    },
    ar_customer: {
        title: "Accounts Receivable by Customer",
        headers: ["Date", "Customer", "Invoice No", "Amount Due", "Due Date"],
        data: [
            ["01 Apr 2026", "Acme Corp", "INV-20260401-001", "$177.00", "01 May 2026"],
            ["02 Apr 2026", "John Doe", "INV-20260402-002", "$45.50", "02 May 2026"]
        ]
    },
    ap_summary: {
        title: "Accounts Payable Summary",
        headers: ["Supplier", "Total Owed", "Overdue"],
        data: [
            ["Global Supply", "$1,200.00", "$0.00"],
            ["Local Parts", "$340.00", "$0.00"]
        ]
    },
    ar_summary: {
        title: "Accounts Receivable Summary",
        headers: ["Customer", "Total Due", "Overdue"],
        data: [
            ["Acme Corp", "$177.00", "$0.00"],
            ["John Doe", "$45.50", "$0.00"]
        ]
    },
    inventory_summary: {
        title: "Inventory Summary",
        headers: ["Part No", "Item Name", "Qty in Stock", "Avg Cost", "Total Value"],
        data: [
            ["O-001", "Premium Oil Filter", "45", "$10.00", "$450.00"],
            ["B-001", "Front Brake Pads", "12", "$30.00", "$360.00"],
            ["S-001", "Iridium Spark Plug", "100", "$6.50", "$650.00"],
            ["A-001", "Cabin Air Filter", "30", "$12.00", "$360.00"],
            ["W-001", "Wiper Blades 22\"", "25", "$9.00", "$225.00"]
        ]
    },
    profit_loss: {
        title: "Profit & Loss",
        headers: ["Category", "Amount"],
        data: [
            ["Sales Revenue", "<span style='color: #10B981'>$5,400.00</span>"],
            ["Cost of Goods Sold (COGS)", "<span style='color: var(--text-danger)'>-$2,100.00</span>"],
            ["<b>Gross Profit</b>", "<b><span style='color: #10B981'>$3,300.00</span></b>"],
            ["Operating Expenses", "<span style='color: var(--text-danger)'>-$800.00</span>"],
            ["<b>Net Profit</b>", "<b><span style='color: #10B981'>$2,500.00</span></b>"]
        ]
    }
};

// Mock data for debtor payable transactions (keyed by debtor id)
const debtorTransactions = {
    1: [ // Acme Corp
        { date: "01 Apr 2026", invoiceNo: "INV-20260401-001", description: "Spare Parts", amount: "$177.00", dueDate: "01 May 2026", status: "Pending" },
        { date: "10 Apr 2026", invoiceNo: "INV-20260410-005", description: "Oil Filters x10", amount: "$155.00", dueDate: "10 May 2026", status: "Pending" }
    ],
    2: [ // John Doe
        { date: "02 Apr 2026", invoiceNo: "INV-20260402-002", description: "Brake Pads", amount: "$45.50", dueDate: "02 May 2026", status: "Pending" }
    ]
};

function renderDebtorCard(debtor) {
    const card = document.getElementById('report-debtor-card');
    if (!card || !debtor) { if (card) card.style.display = 'none'; return; }
    
    const transactions = debtorTransactions[debtor.id] || [];
    const totalDue = transactions.reduce((sum, t) => sum + parseFloat(t.amount.replace('$', '').replace(',', '')), 0);
    
    card.style.display = 'block';
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;">
            <div>
                <h3 style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">${debtor.name}</h3>
                <p style="color: var(--text-secondary); margin-bottom: 4px;">📍 ${debtor.address}</p>
                <p style="color: var(--text-secondary); margin-bottom: 4px;">📞 ${debtor.phoneNo}</p>
                <p style="color: var(--text-secondary);">Credit Period: <strong>${debtor.creditPeriod} days</strong> &nbsp;|&nbsp; Tax Registered: <strong>${debtor.taxRegistered ? 'Yes' : 'No'}</strong></p>
            </div>
            <div style="text-align: right; background: var(--input-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 16px 24px;">
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 4px;">TOTAL OUTSTANDING</p>
                <p style="font-size: 2rem; font-weight: 700; color: #10B981;">$${totalDue.toFixed(2)}</p>
            </div>
        </div>
        <table class="invoice-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Invoice No</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.length > 0 ? transactions.map(t => `
                    <tr>
                        <td>${t.date}</td>
                        <td>${t.invoiceNo}</td>
                        <td>${t.description}</td>
                        <td style="font-weight: 600; color: #10B981;">${t.amount}</td>
                        <td>${t.dueDate}</td>
                        <td><span style="background: rgba(251,191,36,0.15); color: #F59E0B; padding: 3px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">${t.status}</span></td>
                    </tr>
                `).join('') : '<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: 30px;">No transactions found.</td></tr>'}
            </tbody>
        </table>
    `;
    
    // Hide main report table when card is showing
    const tbl = document.querySelector('#report-view .invoice-table:not(#report-debtor-card table)');
    if (tbl) tbl.style.display = transactions.length > 0 || debtor ? 'none' : '';
}

function renderReport(reportId) {
    const reportList = mockReports[reportId];
    if (!reportList) return;
    
    // Deactivate current view
    const activeView = document.querySelector('.content-view.active');
    if (activeView) activeView.classList.remove('active');
    
    // Setup Report title
    reportTitle.innerHTML = reportList.title;
    
    const debtorSelector = document.getElementById('report-debtor-selector');
    const debtorCard = document.getElementById('report-debtor-card');
    const mainTable = document.querySelector('#report-view > .invoice-table');
    
    if (reportId === 'ap_summary') {
        // Show debtor selector, hide date filters and main table
        if (debtorSelector) debtorSelector.style.display = 'block';
        if (debtorCard) { debtorCard.style.display = 'none'; debtorCard.innerHTML = ''; }
        if (mainTable) mainTable.style.display = 'none';
        
        // Populate dropdown from mockDB.debtors
        const debtorSelectEl = document.getElementById('debtor-select');
        if (debtorSelectEl) {
            debtorSelectEl.innerHTML = '<option value="">-- Select a Debtor --</option>' +
                mockDB.debtors.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
            
            // Remove old listener to prevent stacking
            const newSelect = debtorSelectEl.cloneNode(true);
            debtorSelectEl.parentNode.replaceChild(newSelect, debtorSelectEl);
            
            newSelect.addEventListener('change', (e) => {
                const selectedId = parseInt(e.target.value);
                if (!selectedId) {
                    if (debtorCard) { debtorCard.style.display = 'none'; debtorCard.innerHTML = ''; }
                    return;
                }
                const debtor = mockDB.debtors.find(d => d.id === selectedId);
                renderDebtorCard(debtor);
            });
        }
    } else {
        // Normal report: show date filters and main table, hide debtor parts
        if (debtorSelector) debtorSelector.style.display = 'none';
        if (debtorCard) { debtorCard.style.display = 'none'; debtorCard.innerHTML = ''; }
        if (mainTable) mainTable.style.display = '';
        
        if (reportTableHeader) {
            reportTableHeader.innerHTML = reportList.headers.map(h => `<th>${h}</th>`).join('');
        }
        if (reportTableBody) {
            reportTableBody.innerHTML = reportList.data.map(row =>
                `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
            ).join('');
        }
    }
    
    if (reportView) reportView.classList.add('active');
}

// Attach listeners to sidebar tree nodes that have data-report
document.querySelectorAll('.tree-content[data-report]').forEach(node => {
    node.addEventListener('click', (e) => {
        const reportId = node.getAttribute('data-report');
        renderReport(reportId);
    });
});
