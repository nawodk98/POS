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
