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

    // Mock Parts Database
    const partsDatabase = [
        { partNo: 'O-001', name: 'Premium Oil Filter', price: 15.50 },
        { partNo: 'O-002', name: 'Standard Oil Filter', price: 8.50 },
        { partNo: 'B-001', name: 'Front Brake Pads', price: 45.00 },
        { partNo: 'B-002', name: 'Rear Brake Pads', price: 40.00 },
        { partNo: 'S-001', name: 'Iridium Spark Plug', price: 12.00 },
        { partNo: 'A-001', name: 'Cabin Air Filter', price: 20.00 },
        { partNo: 'W-001', name: 'Wiper Blades 22"', price: 18.00 }
    ];

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

            const matches = partsDatabase.filter(part => 
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
            entryPrice.value = part.price.toFixed(2);
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
        });
    }
}

// === Management (CRUD) Logic ===
const mockDB = {
    debtors: [
        { id: 1, name: 'Acme Corp', phone: '555-0100', limit: 5000, isUsed: true },
        { id: 2, name: 'John Doe', phone: '555-0200', limit: 1000, isUsed: false }
    ],
    creditors: [
        { id: 1, name: 'Global Supply', email: 'admin@global.com', balance: 2500, isUsed: true },
        { id: 2, name: 'Local Parts', email: 'sales@local.com', balance: 0, isUsed: false }
    ],
    items: [
        { id: 1, partNo: 'O-001', name: 'Premium Oil Filter', price: 15.50, isUsed: true },
        { id: 2, partNo: 'B-001', name: 'Front Brake Pads', price: 45.00, isUsed: false }
    ],
    users: [
        { id: 1, username: 'admin', role: 'Admin', isUsed: true },
        { id: 2, username: 'cashier1', role: 'Cashier', isUsed: false }
    ]
};

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
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'limit', label: 'Credit Limit', type: 'number' }
    ],
    creditors: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'balance', label: 'Balance', type: 'number' }
    ],
    items: [
        { key: 'partNo', label: 'Part No', type: 'text' },
        { key: 'name', label: 'Item Name', type: 'text' },
        { key: 'price', label: 'Price', type: 'number' }
    ],
    users: [
        { key: 'username', label: 'Username', type: 'text' },
        { key: 'role', label: 'Role', type: 'text' }
    ]
};

if (settingsBtn && managementView) {
    settingsBtn.addEventListener('click', () => {
        document.querySelector('.content-view.active').classList.remove('active');
        managementView.classList.add('active');
        renderMgmtView();
    });

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

    mgmtForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = mgmtIdInput.value;
        const schema = schemas[activeTab];
        let record = { id: id ? parseInt(id) : Date.now(), isUsed: false };

        schema.forEach(field => {
            const input = document.getElementById(`mgmt-${field.key}`);
            record[field.key] = field.type === 'number' ? parseFloat(input.value) : input.value;
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

    // Build Inputs
    mgmtInputsContainer.innerHTML = schema.map(field => `
        <div class="input-group">
            <label>${field.label}</label>
            <input type="${field.type}" id="mgmt-${field.key}" class="glass-input" required ${field.type === 'number' ? 'step="any"' : ''}>
        </div>
    `).join('');

    // Build Table Header
    mgmtTableHeader.innerHTML = schema.map(field => `<th>${field.label}</th>`).join('') + '<th width="120">Actions</th>';

    // Build Table Body
    const data = mockDB[activeTab];
    mgmtTableBody.innerHTML = data.map(item => `
        <tr>
            ${schema.map(field => `<td>${item[field.key]}</td>`).join('')}
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
                document.getElementById(`mgmt-${field.key}`).value = record[field.key];
            });
            mgmtFormTitle.innerText = 'Edit Record';
            mgmtCancelEdit.style.display = 'inline-block';
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
    mgmtCancelEdit.style.display = 'none';
}
