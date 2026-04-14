// POS SYSTEM — script.js (All Bugs Fixed)

// === LOCAL STORAGE PERSISTENCE ===
const DB_KEY = 'pos-db';
function loadDB() { try { const s = localStorage.getItem(DB_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveDB() { try { localStorage.setItem(DB_KEY, JSON.stringify(mockDB)); } catch(e) { console.warn('saveDB error:', e); } }

// === GLOBAL DATABASE ===
const DEFAULT_DB = {
    debtors: [
        { id:1, name:'Acme Corp',     address:'123 Main St', phoneNo:'555-0100', taxRegistered:true,  creditPeriod:30, isUsed:true  },
        { id:2, name:'John Doe',      address:'456 Side St', phoneNo:'555-0200', taxRegistered:false, creditPeriod:15, isUsed:false }
    ],
    creditors: [
        { id:1, name:'Global Supply', address:'789 Ind Ave', phoneNo:'555-0300', taxRegistered:true,  creditPeriod:45, isUsed:true  },
        { id:2, name:'Local Parts',   address:'321 Town Rd', phoneNo:'555-0400', taxRegistered:false, creditPeriod:14, isUsed:false }
    ],
    items: [
        { id:1, partNo:'O-001', name:'Premium Oil Filter',  category:'Filters',     price:15.50, isUsed:true  },
        { id:2, partNo:'O-002', name:'Standard Oil Filter', category:'Filters',     price:8.50,  isUsed:false },
        { id:3, partNo:'B-001', name:'Front Brake Pads',    category:'Brakes',      price:45.00, isUsed:true  },
        { id:4, partNo:'B-002', name:'Rear Brake Pads',     category:'Brakes',      price:40.00, isUsed:false },
        { id:5, partNo:'S-001', name:'Iridium Spark Plug',  category:'Ignition',    price:12.00, isUsed:false },
        { id:6, partNo:'A-001', name:'Cabin Air Filter',    category:'Filters',     price:20.00, isUsed:false },
        { id:7, partNo:'W-001', name:'Wiper Blades 22"',   category:'Accessories', price:18.00, isUsed:false }
    ],
    users: [
        { id:1, username:'admin',    password:'admin', role:'Admin',   isUsed:true  },
        { id:2, username:'cashier1', password:'1234',  role:'Cashier', isUsed:false }
    ]
};
const mockDB = loadDB() || DEFAULT_DB;
// Migration: add password to old saved users
if (mockDB.users) mockDB.users.forEach(u => { if (!u.password) u.password = u.username === 'admin' ? 'admin' : '1234'; });

// === NAVIGATION HELPER ===
function showContent(viewId) {
    // Hide all content panels
    document.querySelectorAll('#menu-view .content-view').forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none';
    });
    // Show the requested panel
    const v = document.getElementById(viewId);
    if (v) {
        v.classList.add('active');
        v.style.display = '';   // Let CSS class handle the display type
    }
}

// === LOGIN ERROR HELPERS ===
function showLoginError(msg) {
    clearLoginError();
    const err = document.createElement('p');
    err.id = 'login-error';
    err.innerText = msg;
    const btn = document.querySelector('#login-form .login-btn');
    if (btn) btn.parentNode.insertBefore(err, btn);
}
function clearLoginError() { const e = document.getElementById('login-error'); if (e) e.remove(); }

// === DOM READY ===
document.addEventListener('DOMContentLoaded', () => {

    // Theme
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('pos-theme');
    if (savedTheme) root.setAttribute('data-theme', savedTheme);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.setAttribute('data-theme', 'dark');
    themeToggle.addEventListener('click', () => {
        const t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', t);
        localStorage.setItem('pos-theme', t);
    });

    // Login
    const loginForm = document.getElementById('login-form');
    const loginView = document.getElementById('login-view');
    const menuView  = document.getElementById('menu-view');
    const logoutBtn = document.getElementById('logout-btn');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const uVal = document.getElementById('username').value.trim();
        const pVal = document.getElementById('password').value;
        const user = mockDB.users.find(u => u.username.toLowerCase() === uVal.toLowerCase() && u.password === pVal);

        const loginBtn = document.querySelector('#login-form .login-btn');
        const orig = loginBtn.innerHTML;
        const spinStyle = document.createElement('style');
        spinStyle.innerHTML = '@keyframes spin{100%{transform:rotate(360deg)}}';
        document.head.appendChild(spinStyle);
        loginBtn.innerHTML = '<span>Authenticating...</span><svg class="btn-icon" style="animation:spin 1s linear infinite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>';
        loginBtn.style.opacity = '0.9';

        setTimeout(() => {
            loginBtn.innerHTML = orig;
            loginBtn.style.opacity = '1';
            if (!user) { showLoginError('Invalid username or password.'); return; }
            clearLoginError();
            sessionStorage.setItem('pos-user', JSON.stringify({ username: user.username, role: user.role }));
            loginView.classList.remove('active');
            setTimeout(() => { menuView.classList.add('active'); showContent('dashboard-view'); }, 500);
        }, 1200);
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('pos-user');
        menuView.classList.remove('active');
        setTimeout(() => { loginView.classList.add('active'); loginForm.reset(); clearLoginError(); }, 500);
    });

    // Sidebar Tree Navigation
    document.querySelectorAll('.tree-node').forEach(node => {
        const content = node.querySelector('.tree-content');
        content.addEventListener('click', (e) => {
            e.stopPropagation();
            if (node.querySelector('.tree-children')) {
                node.classList.toggle('expanded');
            } else {
                document.querySelectorAll('.tree-node.active').forEach(n => n.classList.remove('active'));
                node.classList.add('active');
                if (!content.dataset.report) {
                    sidebarNav(content.querySelector('.tree-title')?.innerText.trim());
                }
            }
        });
    });

    function sidebarNav(title) {
        switch(title) {
            case 'Dashboard':     showContent('dashboard-view'); break;
            case 'Point of Sale': initInvoiceNumber(); showContent('invoice-view'); break;
            case 'Customers':     openManagementTab('debtors'); break;
            case 'Settings':      openManagementTab('debtors'); break;
            case 'Stock In/Out':  initGrn(); showContent('add-stock-view'); break;
            case 'Categories':
            case 'Products':      openManagementTab('items'); break;
        }
    }

    // Dashboard Quick-Action Buttons (by label text)
    document.querySelectorAll('.feature-item').forEach(item => {
        const label = item.querySelector('.feature-label')?.innerText.trim();
        if (label === 'Point of Sale') item.addEventListener('click', () => { initInvoiceNumber(); showContent('invoice-view'); });
        if (label === 'Customers')     item.addEventListener('click', () => openManagementTab('debtors'));
        if (label === 'Daily Summary') item.addEventListener('click', () => renderReport('daily_summary'));
    });

    // Sidebar search
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.tree-children .tree-node').forEach(leaf => {
                leaf.style.display = (leaf.querySelector('.tree-title')?.innerText.toLowerCase() || '').includes(q) ? 'flex' : 'none';
            });
        });
    }
}); // end DOMContentLoaded

// === INVOICE NUMBER ===
function generateInvoiceNumber(n) {
    return `INV-${new Date().toISOString().slice(0,10).replace(/-/g,''  )}-${String(n).padStart(3,'0')}`;
}
function populateInvoiceCustomers() {
    const sel = document.getElementById('invoice-customer');
    if (!sel) return;
    sel.innerHTML = '<option value="">Walk-in Customer</option>' +
        mockDB.debtors.map(d => `<option value="${d.id}" data-tax="${d.taxRegistered}">${d.name}${d.taxRegistered?' (Tax Reg.)':''}</option>`).join('');
}
function populateGrnSuppliers() {
    const sel = document.getElementById('grn-supplier');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Supplier --</option>' +
        mockDB.creditors.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}
function initInvoiceNumber() {
    if (!localStorage.getItem('lastInvoiceId')) localStorage.setItem('lastInvoiceId','1');
    const n = parseInt(localStorage.getItem('lastInvoiceId'));
    const numEl  = document.getElementById('invoice-number');
    const dateEl = document.getElementById('invoice-date');
    if (numEl)  numEl.innerText  = generateInvoiceNumber(n);
    if (dateEl) dateEl.innerText = `Date: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
    populateInvoiceCustomers();
    // Reset the table (use getElementById directly to avoid TDZ issues)
    const tbl = document.getElementById('invoice-items');
    if (tbl) tbl.innerHTML = '';
    // Reset customer selector
    const cSel = document.getElementById('invoice-customer');
    const tCb  = document.getElementById('tax-registered-checkbox');
    if (cSel) cSel.value = '';
    if (tCb) tCb.checked = false;
    // Recalculate using safe direct element lookup
    safeCalculateTotals();
}
// NOTE: do NOT call initInvoiceNumber() here — it's called after all declarations below

// === INVOICE VIEW TOGGLE ===
const newInvoiceBtn   = document.getElementById('new-invoice-btn');
const closeInvoiceBtn = document.getElementById('close-invoice-btn');
if (newInvoiceBtn)   newInvoiceBtn.addEventListener('click',   () => { initInvoiceNumber(); showContent('invoice-view'); });
if (closeInvoiceBtn) closeInvoiceBtn.addEventListener('click', () => showContent('dashboard-view'));

// === GRN (GOODS RECEIVED NOTE) ===
const closeStockBtn = document.getElementById('close-stock-btn');
const saveGrnBtn    = document.getElementById('save-grn-btn');

function generateGrnNumber() {
    return `GRN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(parseInt(localStorage.getItem('lastGrnId')||'0')+1).padStart(3,'0')}`;
}
function initGrn() {
    const numEl  = document.getElementById('grn-number');
    const dateEl = document.getElementById('grn-date');
    if (numEl)  numEl.innerText  = generateGrnNumber();
    if (dateEl) dateEl.innerText = `Date: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
    populateGrnSuppliers();
    const grnItems = document.getElementById('grn-items');
    if (grnItems) grnItems.innerHTML = '';
    calculateGrnTotals();
    ['grn-part-search','grn-ref'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    ['grn-entry-qty','grn-entry-cost'].forEach(id => { const el=document.getElementById(id); if(el){el.value='';el.disabled=true;} });
    const ab = document.getElementById('grn-add-btn'); if(ab) ab.disabled=true;
}
function calculateGrnTotals() {
    let total = 0;
    document.querySelectorAll('#grn-items tr').forEach(row => {
        const qty=parseFloat(row.querySelector('.grn-qty')?.value)||0;
        const cost=parseFloat(row.querySelector('.grn-cost')?.value)||0;
        const tc=row.querySelector('.grn-total'); if(tc) tc.innerText=(qty*cost).toFixed(2);
        total+=qty*cost;
    });
    const sEl=document.getElementById('grn-subtotal'); if(sEl) sEl.innerText=total.toFixed(2);
    const tEl=document.getElementById('grn-total');    if(tEl) tEl.innerText=total.toFixed(2);
}
if (closeStockBtn) closeStockBtn.addEventListener('click', () => showContent('dashboard-view'));
if (saveGrnBtn) {
    saveGrnBtn.addEventListener('click', () => {
        const supEl = document.getElementById('grn-supplier');
        if (!supEl?.value) { alert('Please select a supplier.'); return; }
        const gi = document.getElementById('grn-items');
        if (!gi||gi.rows.length===0) { alert('Add at least one item.'); return; }
        const newId = parseInt(localStorage.getItem('lastGrnId')||'0')+1;
        localStorage.setItem('lastGrnId', newId);
        gi.querySelectorAll('tr').forEach(row => {
            const pNo=row.cells[0]?.innerText, qty=parseFloat(row.querySelector('.grn-qty')?.value)||0;
            const item=mockDB.items.find(i=>i.partNo===pNo);
            if(item){item.stock=(item.stock||0)+qty;item.isUsed=true;}
        });
        saveDB();
        alert(`✅ Stock received!\nGRN: ${document.getElementById('grn-number')?.innerText}`);
        showContent('dashboard-view');
    });
}

// GRN Part Search
const grnPartSearch = document.getElementById('grn-part-search');
const grnDropdown   = document.getElementById('grn-autocomplete-dropdown');
const grnEntryQty   = document.getElementById('grn-entry-qty');
const grnEntryCost  = document.getElementById('grn-entry-cost');
const grnAddBtn     = document.getElementById('grn-add-btn');
const grnItemsTable = document.getElementById('grn-items');
let grnSelectedPart = null;

if (grnPartSearch) {
    grnPartSearch.addEventListener('input', (e) => {
        const q=e.target.value.toLowerCase().trim();
        grnDropdown.innerHTML=''; grnSelectedPart=null;
        grnEntryQty.disabled=true; grnEntryCost.disabled=true; grnAddBtn.disabled=true;
        if(!q){grnDropdown.style.display='none';return;}
        const matches=mockDB.items.filter(p=>p.name.toLowerCase().includes(q)||p.partNo.toLowerCase().includes(q));
        if(matches.length>0){
            grnDropdown.style.display='block';
            matches.forEach(part=>{
                const d=document.createElement('div'); d.className='dropdown-item';
                d.innerHTML=`<span class="dropdown-item-title">${part.name}</span><span class="dropdown-item-desc">${part.partNo}</span>`;
                d.addEventListener('click',()=>selectGrnPart(part)); grnDropdown.appendChild(d);
            });
        } else { grnDropdown.style.display='none'; }
    });
    document.addEventListener('click',(e)=>{ if(e.target!==grnPartSearch) grnDropdown.style.display='none'; });

    function selectGrnPart(part) {
        grnSelectedPart=part; grnPartSearch.value=part.name;
        grnEntryCost.value=(parseFloat(part.price)||0).toFixed(2); grnEntryQty.value=1;
        grnEntryQty.disabled=false; grnEntryCost.disabled=false; grnAddBtn.disabled=false;
        grnDropdown.style.display='none'; grnEntryQty.focus();
    }
    function addGrnEntry() {
        if(!grnSelectedPart) return;
        const qty=parseFloat(grnEntryQty.value)||1, cost=parseFloat(grnEntryCost.value)||0;
        const row=document.createElement('tr');
        row.innerHTML=`<td>${grnSelectedPart.partNo}</td><td>${grnSelectedPart.name}</td>
            <td><input type="number" class="item-qty glass-input num-input grn-qty" value="${qty}" min="1" style="width:100%;text-align:center;"></td>
            <td><input type="number" class="item-price glass-input num-input grn-cost" value="${cost.toFixed(2)}" step="0.01" style="width:100%;text-align:center;"></td>
            <td class="grn-total">${(qty*cost).toFixed(2)}</td>
            <td><button class="action-btn text-danger grn-remove-btn">×</button></td>`;
        grnItemsTable.appendChild(row);
        grnPartSearch.value=''; grnEntryQty.value=''; grnEntryCost.value='';
        grnEntryQty.disabled=true; grnEntryCost.disabled=true; grnAddBtn.disabled=true;
        grnSelectedPart=null; grnPartSearch.focus(); calculateGrnTotals();
    }
    grnAddBtn.addEventListener('click', addGrnEntry);
    [grnPartSearch,grnEntryQty,grnEntryCost].forEach(inp=>{
        inp.addEventListener('keydown',(e)=>{
            if(e.key==='Enter'){e.preventDefault();
                if(grnSelectedPart) addGrnEntry();
                else if(inp===grnPartSearch&&grnDropdown.children.length>0) grnDropdown.children[0].click();
            }
        });
    });
}
if(grnItemsTable){
    grnItemsTable.addEventListener('input',(e)=>{if(e.target.classList.contains('grn-qty')||e.target.classList.contains('grn-cost'))calculateGrnTotals();});
    grnItemsTable.addEventListener('click',(e)=>{if(e.target.classList.contains('grn-remove-btn')){e.target.closest('tr').remove();calculateGrnTotals();}});
}

// === INVOICE TAX & ITEMS ===
const invoiceCustomerSelect  = document.getElementById('invoice-customer');
const taxRegisteredCheckbox  = document.getElementById('tax-registered-checkbox');
const invoiceTitle           = document.getElementById('invoice-title');
const taxRow                 = document.getElementById('tax-row');
const invoiceTaxDisplay      = document.getElementById('invoice-tax');
const invoiceGrandTotal      = document.getElementById('invoice-grand-total');
const invoiceSubtotalDisplay = document.getElementById('invoice-subtotal');
const invoiceItemsTable      = document.getElementById('invoice-items');
let baseSubtotal = 0;

// Safe version that uses getElementById directly (safe to call before const declarations)
function safeCalculateTotals() {
    const tbl = document.getElementById('invoice-items');
    const subEl = document.getElementById('invoice-subtotal');
    const taxCb = document.getElementById('tax-registered-checkbox');
    const titleEl = document.getElementById('invoice-title');
    const taxRowEl = document.getElementById('tax-row');
    const taxEl = document.getElementById('invoice-tax');
    const totalEl = document.getElementById('invoice-grand-total');

    let sub = 0;
    if (tbl) tbl.querySelectorAll('tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        const td = row.querySelector('.item-total'); if (td) td.innerText = (qty*price).toFixed(2);
        sub += qty * price;
    });
    if (subEl) subEl.innerText = sub.toFixed(2);
    baseSubtotal = sub;

    const isTax = taxCb ? taxCb.checked : false;
    if (isTax) {
        if (titleEl) { titleEl.innerText = 'TAX INVOICE'; titleEl.style.color = '#10B981'; }
        if (taxRowEl) taxRowEl.style.display = 'flex';
        const tax = sub * 0.18;
        if (taxEl) taxEl.innerText = tax.toFixed(2);
        if (totalEl) totalEl.innerText = (sub + tax).toFixed(2);
    } else {
        if (titleEl) { titleEl.innerText = 'Standard Invoice'; titleEl.style.color = 'var(--input-focus)'; }
        if (taxRowEl) taxRowEl.style.display = 'none';
        if (totalEl) totalEl.innerText = sub.toFixed(2);
    }
}

function calculateTotals() {
    baseSubtotal=0;
    if(!invoiceItemsTable) return;
    invoiceItemsTable.querySelectorAll('tr').forEach(row=>{
        const qty=parseFloat(row.querySelector('.item-qty')?.value)||0;
        const price=parseFloat(row.querySelector('.item-price')?.value)||0;
        const td=row.querySelector('.item-total'); if(td) td.innerText=(qty*price).toFixed(2);
        baseSubtotal+=qty*price;
    });
    if(invoiceSubtotalDisplay) invoiceSubtotalDisplay.innerText=baseSubtotal.toFixed(2);
    updateInvoiceDisplay();
}
function updateInvoiceDisplay() {
    if(!taxRegisteredCheckbox) return;
    const isTax=taxRegisteredCheckbox.checked;
    if(isTax){
        if(invoiceTitle){invoiceTitle.innerText='TAX INVOICE';invoiceTitle.style.color='#10B981';}
        if(taxRow) taxRow.style.display='flex';
        const tax=baseSubtotal*0.18;
        if(invoiceTaxDisplay) invoiceTaxDisplay.innerText=tax.toFixed(2);
        if(invoiceGrandTotal) invoiceGrandTotal.innerText=(baseSubtotal+tax).toFixed(2);
    } else {
        if(invoiceTitle){invoiceTitle.innerText='Standard Invoice';invoiceTitle.style.color='var(--input-focus)';}
        if(taxRow) taxRow.style.display='none';
        if(invoiceGrandTotal) invoiceGrandTotal.innerText=baseSubtotal.toFixed(2);
    }
}
if(invoiceCustomerSelect&&taxRegisteredCheckbox){
    invoiceCustomerSelect.addEventListener('change',(e)=>{
        const opt=e.target.options[e.target.selectedIndex];
        taxRegisteredCheckbox.checked=(opt.dataset.tax==='true'); updateInvoiceDisplay();
    });
    taxRegisteredCheckbox.addEventListener('change', updateInvoiceDisplay);

    const partSearchInput      = document.getElementById('part-search-input');
    const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
    const entryQty             = document.getElementById('entry-qty');
    const entryPrice           = document.getElementById('entry-price');
    const addEntryBtn          = document.getElementById('add-entry-btn');
    let selectedPart = null;

    if(partSearchInput){
        partSearchInput.addEventListener('input',(e)=>{
            const q=e.target.value.toLowerCase().trim();
            autocompleteDropdown.innerHTML=''; selectedPart=null;
            entryQty.disabled=true; entryPrice.disabled=true; addEntryBtn.disabled=true;
            if(!q){autocompleteDropdown.style.display='none';return;}
            const matches=mockDB.items.filter(p=>p.name.toLowerCase().includes(q)||p.partNo.toLowerCase().includes(q));
            if(matches.length>0){
                autocompleteDropdown.style.display='block';
                matches.forEach(part=>{
                    const d=document.createElement('div'); d.className='dropdown-item';
                    d.innerHTML=`<span class="dropdown-item-title">${part.name}</span><span class="dropdown-item-desc">${part.partNo}</span>`;
                    d.addEventListener('click',()=>selectPart(part)); autocompleteDropdown.appendChild(d);
                });
            } else { autocompleteDropdown.style.display='none'; }
        });
        document.addEventListener('click',(e)=>{ if(e.target!==partSearchInput) autocompleteDropdown.style.display='none'; });

        function selectPart(part) {
            selectedPart=part; partSearchInput.value=part.name;
            entryPrice.value=(parseFloat(part.price)||0).toFixed(2); entryQty.value=1;
            entryQty.disabled=false; entryPrice.disabled=false; addEntryBtn.disabled=false;
            autocompleteDropdown.style.display='none'; entryQty.focus();
        }
        function addCurrentEntry() {
            if(!selectedPart) return;
            const qty=parseInt(entryQty.value)||1, price=parseFloat(entryPrice.value)||selectedPart.price;
            const row=document.createElement('tr');
            row.innerHTML=`<td>${selectedPart.partNo}</td><td>${selectedPart.name}</td>
                <td><input type="number" class="item-qty glass-input num-input" value="${qty}" min="1" style="width:100%;text-align:center;"></td>
                <td><input type="number" class="item-price glass-input num-input" value="${price.toFixed(2)}" step="0.01" style="width:100%;text-align:center;"></td>
                <td class="item-total">${(qty*price).toFixed(2)}</td>
                <td><button class="action-btn text-danger remove-item-btn">×</button></td>`;
            invoiceItemsTable.appendChild(row);
            partSearchInput.value=''; entryQty.value=''; entryPrice.value='';
            entryQty.disabled=true; entryPrice.disabled=true; addEntryBtn.disabled=true;
            selectedPart=null; partSearchInput.focus(); calculateTotals();
        }
        addEntryBtn.addEventListener('click', addCurrentEntry);
        [partSearchInput,entryQty,entryPrice].forEach(inp=>{
            inp.addEventListener('keydown',(e)=>{
                if(e.key==='Enter'){e.preventDefault();
                    if(selectedPart) addCurrentEntry();
                    else if(inp===partSearchInput&&autocompleteDropdown.children.length>0) autocompleteDropdown.children[0].click();
                }
            });
        });
    }
    if(invoiceItemsTable){
        invoiceItemsTable.addEventListener('input',(e)=>{if(e.target.classList.contains('item-qty')||e.target.classList.contains('item-price'))calculateTotals();});
        invoiceItemsTable.addEventListener('click',(e)=>{if(e.target.classList.contains('remove-item-btn')){e.target.closest('tr').remove();calculateTotals();}});
    }
    calculateTotals();
    const printBtn=document.getElementById('print-invoice-btn');
    if(printBtn){
        printBtn.addEventListener('click',()=>{
            window.print();
            const newId=parseInt(localStorage.getItem('lastInvoiceId')||'1')+1;
            localStorage.setItem('lastInvoiceId',newId); initInvoiceNumber();
        });
    }
}

// === MANAGEMENT (CRUD) ===
const settingsBtn         = document.getElementById('settings-btn');
const managementView      = document.getElementById('management-view');
const closeMgmtBtn        = document.getElementById('close-mgmt-btn');
const mgmtTabs            = document.querySelectorAll('.mgmt-tab');
const mgmtTitle           = document.getElementById('mgmt-title');
const mgmtInputsContainer = document.getElementById('mgmt-inputs-container');
const mgmtTableHeader     = document.getElementById('mgmt-table-header');
const mgmtTableBody       = document.getElementById('mgmt-table-body');
const mgmtForm            = document.getElementById('mgmt-form');
const mgmtIdInput         = document.getElementById('mgmt-id');
const mgmtCancelEdit      = document.getElementById('mgmt-cancel-edit');
const mgmtFormTitle       = document.getElementById('mgmt-form-title');
const crudModalWrapper    = document.getElementById('crud-modal-wrapper');
const crudModalClose      = document.getElementById('crud-modal-close');
const mgmtOpenAddBtn      = document.getElementById('mgmt-open-add-btn');
let activeTab = 'debtors';

const schemas = {
    debtors:   [{key:'name',label:'Name',type:'text',required:true},{key:'address',label:'Address',type:'text',required:true},{key:'phoneNo',label:'Phone No',type:'text',required:true},{key:'taxRegistered',label:'Tax Registered',type:'checkbox',required:false},{key:'creditPeriod',label:'Credit Period (Days)',type:'number',required:true}],
    creditors: [{key:'name',label:'Name',type:'text',required:true},{key:'address',label:'Address',type:'text',required:true},{key:'phoneNo',label:'Phone No',type:'text',required:true},{key:'taxRegistered',label:'Tax Registered',type:'checkbox',required:false},{key:'creditPeriod',label:'Credit Period (Days)',type:'number',required:true}],
    items:     [{key:'partNo',label:'Part No',type:'text',required:true},{key:'name',label:'Item Name',type:'text',required:true},{key:'category',label:'Category',type:'text',required:false},{key:'price',label:'Price',type:'number',required:false}],
    users:     [{key:'username',label:'Username',type:'text',required:true},{key:'password',label:'Password',type:'password',required:true},{key:'role',label:'Role',type:'text',required:true}]
};

function openManagementTab(tab) {
    showContent('management-view');
    mgmtTabs.forEach(t=>t.classList.remove('active'));
    const target=Array.from(mgmtTabs).find(t=>t.dataset.tab===tab);
    if(target) target.classList.add('active');
    activeTab=tab; resetMgmtForm(); renderMgmtView();
}

if(settingsBtn&&managementView){
    settingsBtn.addEventListener('click', ()=>openManagementTab('debtors'));
    closeMgmtBtn.addEventListener('click', ()=>showContent('dashboard-view'));
    mgmtTabs.forEach(tab=>{ tab.addEventListener('click',()=>{ mgmtTabs.forEach(t=>t.classList.remove('active')); tab.classList.add('active'); activeTab=tab.dataset.tab; resetMgmtForm(); renderMgmtView(); }); });
    if(mgmtCancelEdit) mgmtCancelEdit.addEventListener('click', resetMgmtForm);
    if(crudModalClose) crudModalClose.addEventListener('click', resetMgmtForm);
    if(mgmtOpenAddBtn) mgmtOpenAddBtn.addEventListener('click',()=>{ resetMgmtForm(); crudModalWrapper.style.display='flex'; });

    mgmtForm.addEventListener('submit',(e)=>{
        e.preventDefault();
        const id=mgmtIdInput.value, schema=schemas[activeTab];
        let record={id:id?parseInt(id):Date.now(), isUsed:false};
        schema.forEach(field=>{
            const inp=document.getElementById(`mgmt-${field.key}`); if(!inp) return;
            if(field.type==='checkbox') record[field.key]=inp.checked;
            else if(field.type==='number'){const v=parseFloat(inp.value);record[field.key]=isNaN(v)?'':v;}
            else record[field.key]=inp.value;
        });
        if(id){const idx=mockDB[activeTab].findIndex(i=>i.id==id);if(idx>-1){record.isUsed=mockDB[activeTab][idx].isUsed;mockDB[activeTab][idx]=record;}}
        else mockDB[activeTab].push(record);
        saveDB();
        if(activeTab==='debtors')   populateInvoiceCustomers();
        if(activeTab==='creditors') populateGrnSuppliers();
        resetMgmtForm(); renderMgmtView();
    });
}

const addProductBtn = document.getElementById('add-product-btn');
if(addProductBtn){
    addProductBtn.addEventListener('click',()=>{
        openManagementTab('items');
        setTimeout(()=>{ if(crudModalWrapper) crudModalWrapper.style.display='flex'; },100);
    });
}

function renderMgmtView() {
    if(!mgmtTitle) return;
    mgmtTitle.innerText=`Manage ${activeTab.charAt(0).toUpperCase()+activeTab.slice(1)}`;
    const schema=schemas[activeTab];
    mgmtInputsContainer.innerHTML=schema.map(field=>{
        if(field.type==='checkbox') return `<label style="display:flex;align-items:center;gap:10px;color:var(--text-secondary);cursor:pointer;"><input type="checkbox" id="mgmt-${field.key}" style="width:20px;height:20px;"><span>${field.label}</span></label>`;
        return `<div class="input-group"><label>${field.label}</label><input type="${field.type}" id="mgmt-${field.key}" class="glass-input" ${field.required?'required':''} ${field.type==='number'?'step="any"':''} style="height:48px;"></div>`;
    }).join('');
    const vis=schema.filter(f=>f.key!=='password');
    mgmtTableHeader.innerHTML=vis.map(f=>`<th>${f.label}</th>`).join('')+'<th width="120">Actions</th>';
    mgmtTableBody.innerHTML=mockDB[activeTab].map(item=>`<tr>
        ${vis.map(field=>{let v=item[field.key];if(field.type==='checkbox')v=v?'Yes':'No';if(v==null)v='';return`<td>${v}</td>`;}).join('')}
        <td>
            <button class="action-btn mgmt-edit-btn" data-id="${item.id}" style="display:inline-block;margin-right:5px;opacity:1;color:var(--input-focus);">Edit</button>
            <button class="action-btn text-danger mgmt-del-btn" data-id="${item.id}" style="display:inline-block;opacity:1;" ${item.isUsed?'disabled title="In use"':''}>${item.isUsed?'🔒':'×'}</button>
        </td></tr>`).join('');

    document.querySelectorAll('.mgmt-edit-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            const rec=mockDB[activeTab].find(i=>i.id==btn.dataset.id); if(!rec) return;
            mgmtIdInput.value=rec.id;
            schema.forEach(field=>{ const el=document.getElementById(`mgmt-${field.key}`); if(!el) return; if(field.type==='checkbox') el.checked=!!rec[field.key]; else el.value=rec[field.key]??''; });
            mgmtFormTitle.innerText='Edit Record'; crudModalWrapper.style.display='flex';
        });
    });
    document.querySelectorAll('.mgmt-del-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            const rec=mockDB[activeTab].find(i=>i.id==btn.dataset.id); if(!rec) return;
            if(rec.isUsed){alert('Cannot delete: record is in use.');return;}
            if(confirm('Delete this record?')){ mockDB[activeTab]=mockDB[activeTab].filter(i=>i.id!=btn.dataset.id); saveDB(); renderMgmtView(); }
        });
    });
}
function resetMgmtForm() {
    if(mgmtForm) mgmtForm.reset();
    if(mgmtIdInput) mgmtIdInput.value='';
    if(mgmtFormTitle) mgmtFormTitle.innerText='Add New';
    if(crudModalWrapper) crudModalWrapper.style.display='none';
}

// === REPORTS ===
const reportView        = document.getElementById('report-view');
const reportTitle       = document.getElementById('report-title');
const reportTableHeader = document.getElementById('report-table-header');
const reportTableBody   = document.getElementById('report-table-body');
const closeReportBtn    = document.getElementById('close-report-btn');
const printReportBtn    = document.getElementById('print-report-btn');
if(closeReportBtn) closeReportBtn.addEventListener('click', ()=>showContent('dashboard-view'));
if(printReportBtn) printReportBtn.addEventListener('click', ()=>window.print());

const mockReports = {
    daily_summary:    { title:'📊 Daily Summary',                    headers:['Category','Value'],                                    data:[['Total Sales Today','$207.50'],['Number of Invoices','3'],['Items Sold','8'],['Tax Collected (18%)','$27.00'],['Outstanding Receivables','$222.50']] },
    periodic_sales:   { title:'Periodic Sales Report',               headers:['Date','Invoice No','Customer','Total Amount'],          data:[['01 Apr 2026','INV-20260401-001','Acme Corp','$150.00'],['02 Apr 2026','INV-20260402-002','John Doe','$45.50'],['05 Apr 2026','INV-20260405-003','Walk-in','$12.00']] },
    tax_liability:    { title:'Tax Liability Report',                 headers:['Date','Invoice No','Taxable Amount','Tax (18%)'],       data:[['01 Apr 2026','INV-20260401-001','$150.00','$27.00'],['08 Apr 2026','INV-20260408-004','$300.00','$54.00']] },
    ap_supplier:      { title:'Accounts Payable by Supplier',         headers:['Date','Supplier','Invoice Ref','Amount','Status'],      data:[['28 Mar 2026','Global Supply','GS-9021','$1,200.00','Pending'],['10 Apr 2026','Local Parts','LP-441','$340.00','Pending']] },
    ar_customer:      { title:'Accounts Receivable by Customer',      headers:['Date','Customer','Invoice No','Amount Due','Due Date'], data:[['01 Apr 2026','Acme Corp','INV-20260401-001','$177.00','01 May 2026'],['02 Apr 2026','John Doe','INV-20260402-002','$45.50','02 May 2026']] },
    ap_summary:       { title:'Accounts Payable Summary',             headers:['Supplier','Total Owed','Overdue'],                      data:[['Global Supply','$1,200.00','$0.00'],['Local Parts','$340.00','$0.00']] },
    ar_summary:       { title:'Accounts Receivable Summary',          headers:['Customer','Total Due','Overdue'],                       data:[['Acme Corp','$177.00','$0.00'],['John Doe','$45.50','$0.00']] },
    inventory_summary:{ title:'Inventory Summary',                    headers:['Part No','Item Name','Qty in Stock','Avg Cost','Total Value'], data:[['O-001','Premium Oil Filter','45','$10.00','$450.00'],['B-001','Front Brake Pads','12','$30.00','$360.00'],['S-001','Iridium Spark Plug','100','$6.50','$650.00'],['A-001','Cabin Air Filter','30','$12.00','$360.00']] },
    profit_loss:      { title:'Profit & Loss',                        headers:['Category','Amount'],                                   data:[['Sales Revenue',"<span style='color:#10B981'>$5,400.00</span>"],['Cost of Goods Sold',"<span style='color:#EF4444'>-$2,100.00</span>"],['<b>Gross Profit</b>',"<b><span style='color:#10B981'>$3,300.00</span></b>"],['Operating Expenses',"<span style='color:#EF4444'>-$800.00</span>"],['<b>Net Profit</b>',"<b><span style='color:#10B981'>$2,500.00</span></b>"]] }
};

const creditorTransactions = {
    1:[{date:'28 Mar 2026',invoiceNo:'GRN-20260328-001',description:'Bulk Oil Filters',amount:'$1,200.00',dueDate:'12 May 2026',status:'Pending'}],
    2:[{date:'10 Apr 2026',invoiceNo:'GRN-20260410-002',description:'Brake Pads x8',amount:'$340.00',dueDate:'24 Apr 2026',status:'Pending'}]
};
const debtorTransactions = {
    1:[{date:'01 Apr 2026',invoiceNo:'INV-20260401-001',description:'Spare Parts',amount:'$177.00',dueDate:'01 May 2026',status:'Pending'},{date:'10 Apr 2026',invoiceNo:'INV-20260410-005',description:'Oil Filters x10',amount:'$155.00',dueDate:'10 May 2026',status:'Pending'}],
    2:[{date:'02 Apr 2026',invoiceNo:'INV-20260402-002',description:'Brake Pads',amount:'$45.50',dueDate:'02 May 2026',status:'Pending'}]
};

function renderEntityCard(entity, transactions, type) {
    const card=document.getElementById('report-debtor-card'); if(!card||!entity){if(card)card.style.display='none';return;}
    const totalDue=transactions.reduce((s,t)=>s+parseFloat(t.amount.replace(/[$,]/g,'')),0);
    const accent=type==='creditor'?'#F59E0B':'#10B981', label=type==='creditor'?'TOTAL PAYABLE':'TOTAL OUTSTANDING', txLabel=type==='creditor'?'GRN No':'Invoice No';
    card.style.display='block';
    card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:20px;margin-bottom:20px;">
        <div><h3 style="font-size:1.4rem;font-weight:700;color:var(--text-primary);margin-bottom:6px;">${entity.name}</h3>
            <p style="color:var(--text-secondary);margin-bottom:4px;">📍 ${entity.address}</p>
            <p style="color:var(--text-secondary);margin-bottom:4px;">📞 ${entity.phoneNo}</p>
            <p style="color:var(--text-secondary);">Credit: <strong>${entity.creditPeriod} days</strong> | Tax Reg: <strong>${entity.taxRegistered?'Yes':'No'}</strong></p></div>
        <div style="text-align:right;background:var(--input-bg);border:1px solid var(--card-border);border-radius:12px;padding:16px 24px;">
            <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:4px;">${label}</p>
            <p style="font-size:2rem;font-weight:700;color:${accent};">$${totalDue.toFixed(2)}</p></div></div>
    <table class="invoice-table"><thead><tr><th>Date</th><th>${txLabel}</th><th>Description</th><th>Amount</th><th>Due Date</th><th>Status</th></tr></thead>
    <tbody>${transactions.length>0?transactions.map(t=>`<tr><td>${t.date}</td><td>${t.invoiceNo}</td><td>${t.description}</td>
        <td style="font-weight:600;color:${accent};">${t.amount}</td><td>${t.dueDate}</td>
        <td><span style="background:rgba(251,191,36,0.15);color:#F59E0B;padding:3px 10px;border-radius:20px;font-size:0.85rem;font-weight:600;">${t.status}</span></td></tr>`).join('')
        :'<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:30px;">No transactions found.</td></tr>'}</tbody></table>`;
    const mt=document.querySelector('#report-view > .invoice-table'); if(mt) mt.style.display='none';
}

let currentReportId=null;

// Filter button
const filterBtn=document.querySelector('#report-date-filters button');
if(filterBtn){
    filterBtn.addEventListener('click',()=>{
        if(!currentReportId) return;
        const inputs=document.querySelectorAll('#report-date-filters input[type="date"]');
        if(inputs.length<2) return;
        const from=new Date(inputs[0].value), to=new Date(inputs[1].value); to.setHours(23,59,59);
        const rpt=mockReports[currentReportId]; if(!rpt) return;
        const filtered=rpt.data.filter(row=>{ const d=new Date(row[0].replace(/<[^>]+>/g,'').trim()); return isNaN(d.getTime())||( d>=from&&d<=to); });
        if(reportTableBody){
            if(filtered.length>0) reportTableBody.innerHTML=filtered.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
            else reportTableBody.innerHTML=`<tr><td colspan="${rpt.headers.length}" style="text-align:center;color:var(--text-secondary);padding:30px;">No records in selected date range.</td></tr>`;
        }
    });
}

function renderReport(reportId) {
    const rpt=mockReports[reportId]; if(!rpt) return;
    currentReportId=reportId;
    showContent('report-view');
    reportTitle.innerHTML=rpt.title;

    const debtorSelector=document.getElementById('report-debtor-selector');
    const debtorCard=document.getElementById('report-debtor-card');
    const mainTable=document.querySelector('#report-view > .invoice-table');
    const dateFilters=document.getElementById('report-date-filters');

    if(debtorCard){debtorCard.style.display='none';debtorCard.innerHTML='';}
    if(debtorSelector) debtorSelector.style.display='none';

    const needsSelector=['ap_summary','ar_customer','ar_summary'].includes(reportId);
    const isAP = reportId==='ap_summary';

    if(needsSelector){
        if(debtorSelector) debtorSelector.style.display='block';
        if(mainTable) mainTable.style.display='none';
        if(dateFilters) dateFilters.style.display='none';

        const sEl=document.getElementById('debtor-select');
        if(sEl){
            const src=isAP?mockDB.creditors:mockDB.debtors;
            const ph=isAP?'-- Select a Supplier --':'-- Select a Customer --';
            sEl.innerHTML=`<option value="">${ph}</option>`+src.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
            const newSel=sEl.cloneNode(true); sEl.parentNode.replaceChild(newSel,sEl);
            newSel.addEventListener('change',(e)=>{
                const id=parseInt(e.target.value);
                if(!id){if(debtorCard){debtorCard.style.display='none';debtorCard.innerHTML='';}return;}
                if(isAP){
                    const c=mockDB.creditors.find(x=>x.id===id);
                    renderEntityCard(c,creditorTransactions[id]||[],'creditor');
                } else {
                    const d=mockDB.debtors.find(x=>x.id===id);
                    renderEntityCard(d,debtorTransactions[id]||[],'debtor');
                }
            });
        }
    } else {
        if(debtorSelector) debtorSelector.style.display='none';
        if(mainTable) mainTable.style.display='';
        if(dateFilters) dateFilters.style.display='flex';
        if(reportTableHeader) reportTableHeader.innerHTML=rpt.headers.map(h=>`<th>${h}</th>`).join('');
        if(reportTableBody)   reportTableBody.innerHTML=rpt.data.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
    }
}

// Sidebar report node listeners
document.querySelectorAll('.tree-content[data-report]').forEach(node=>{
    node.addEventListener('click',()=>renderReport(node.getAttribute('data-report')));
});

// Initialize invoice AFTER all global const declarations (avoids TDZ ReferenceError)
initInvoiceNumber();
