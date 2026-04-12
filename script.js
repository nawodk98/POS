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

    // Table Event Delegation for inputs and remove buttons
    if (invoiceItemsTable) {
        invoiceItemsTable.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-price')) {
                calculateTotals();
            }
        });

        invoiceItemsTable.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-btn')) {
                const rowCount = invoiceItemsTable.querySelectorAll('tr').length;
                if (rowCount > 1) {
                    e.target.closest('tr').remove();
                    calculateTotals();
                }
            }
        });
    }

    // Add Item Logic
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" placeholder="Part No. or Name..." class="glass-input item-input item-name"></td>
                <td><input type="number" placeholder="Qty" step="1" class="glass-input num-input item-qty"></td>
                <td><input type="number" placeholder="Price" step="0.01" class="glass-input num-input item-price"></td>
                <td class="item-total">0.00</td>
                <td><button class="action-btn text-danger remove-item-btn">×</button></td>
            `;
            invoiceItemsTable.appendChild(newRow);
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
