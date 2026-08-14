// Configuration
const API_BASE = "http://localhost:8000/api"; // UPDATE THIS FOR PRODUCTION
const ENDPOINTS = {
    FIELDS: "/fields/",
    CLASSES: "/getclass/"
};

// Application State
let state = {
    currentStep: 1,
    formConfig: null,
    classes: [],
    formData: {},
    docFiles: {},
    loading: true,
    error: null
};

// UI Selectors
const screens = {
    loading: document.getElementById('loading-screen'),
    form: document.getElementById('form-container'),
    error: document.getElementById('error-screen')
};

const views = {
    step1: document.getElementById('step-1'),
    step2: document.getElementById('step-2'),
    step3: document.getElementById('step-3'),
    success: document.getElementById('step-success')
};

const controls = {
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    submitBtn: document.getElementById('submit-btn'),
    progressBar: document.getElementById('progress-bar'),
    stepBadge: document.getElementById('step-badge')
};

// Initialization
async function init() {
    try {
        const [fieldsResponse, classesResponse] = await Promise.all([
            fetch(`${API_BASE}${ENDPOINTS.FIELDS}`),
            fetch(`${API_BASE}${ENDPOINTS.CLASSES}`)
        ]);

        if (!fieldsResponse.ok) throw new Error("Failed to load form structure.");
        
        const fieldsData = await fieldsResponse.json();
        const classesData = await classesResponse.json();

        // 1. Get latest form
        const forms = Array.isArray(fieldsData) ? fieldsData : (fieldsData.results || []);
        if (forms.length === 0) throw new Error("No active admission forms found.");
        state.formConfig = forms.sort((a, b) => b.id - a.id)[0];

        // 2. Process classes
        const rawClasses = Array.isArray(classesData) ? classesData : (classesData.results || []);
        state.classes = Array.from(
            new Map(rawClasses.map(item => [item.school_class, item])).values()
        );

        // 3. Setup UI
        renderFormInfo();
        renderStep1();
        hideLoading();
    } catch (err) {
        console.error(err);
        showError(err.message);
    }
}

// Rendering Logic
function renderFormInfo() {
    document.getElementById('form-title').textContent = state.formConfig.title;
    document.getElementById('form-desc').textContent = state.formConfig.description;
}

function renderStep1() {
    const container = document.getElementById('dynamic-sections');
    container.innerHTML = '';

    // Sort sections
    const sortedSections = [...state.formConfig.sections].sort((a, b) => a.order - b.order);

    sortedSections.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'section-group';
        
        // Header
        const header = `
            <div class="section-title-container">
                <div class="accent-bar bar-indigo"></div>
                <h3>${section.title}</h3>
            </div>
        `;
        
        // Fields
        const fieldsGrid = document.createElement('div');
        fieldsGrid.className = 'fields-grid';
        
        const sortedFields = [...section.fields].sort((a, b) => a.order - b.order);
        
        sortedFields.forEach(field => {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'field-group';
            
            const label = `<label>${field.label} ${field.is_required ? '<span class="required">*</span>' : ''}</label>`;
            let input = '';

            if (field.field_type === 'textarea') {
                input = `<textarea id="field-${field.id}" placeholder="Enter details..." oninput="updateData('${field.id}', this.value)">${state.formData[field.id] || ''}</textarea>`;
            } else if (field.field_type === 'select') {
                input = `<select id="field-${field.id}" onchange="updateData('${field.id}', this.value)">
                    <option value="">Select option</option>
                    ${renderOptions(field)}
                </select>`;
            } else {
                input = `<input type="${field.field_type}" id="field-${field.id}" value="${state.formData[field.id] || ''}" oninput="updateData('${field.id}', this.value)">`;
            }

            fieldGroup.innerHTML = `${label}${input}`;
            fieldsGrid.appendChild(fieldGroup);
        });

        sectionEl.innerHTML = header;
        sectionEl.appendChild(fieldsGrid);
        container.appendChild(sectionEl);
    });
}

function renderOptions(field) {
    if (field.label.toLowerCase().includes("class") && state.classes.length > 0) {
        return state.classes.map(cls => `<option value="${cls.school_class}" ${state.formData[field.id] === cls.school_class ? 'selected' : ''}>${cls.school_class}</option>`).join('');
    }
    return (field.options || []).map(opt => `<option value="${opt.value}" ${state.formData[field.id] === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('');
}

function renderStep2() {
    const container = document.getElementById('dynamic-documents');
    container.innerHTML = '';

    state.formConfig.label.forEach(doc => {
        const isTextInput = doc.label.toLowerCase().includes("number") || doc.label.toLowerCase().includes("id");
        
        const docEl = document.createElement('div');
        docEl.className = 'doc-card';
        
        const displayValue = isTextInput 
            ? (state.formData[`doc_${doc.id}`] || '') 
            : (state.docFiles[doc.id] ? state.docFiles[doc.id].name : 'PDF or JPG accepted');

        const inputHtml = isTextInput
            ? `<input type="text" class="doc-input" placeholder="Enter ID" value="${displayValue}" oninput="updateData('doc_${doc.id}', this.value)">`
            : `
                <input type="file" id="file-${doc.id}" class="hidden" onchange="handleFileUpload(${doc.id}, this)">
                <button class="btn btn-outline" onclick="document.getElementById('file-${doc.id}').click()">
                    <i data-lucide="upload"></i> ${state.docFiles[doc.id] ? 'Change' : 'Upload'}
                </button>
            `;

        docEl.innerHTML = `
            <div class="doc-info">
                <div class="doc-icon"><i data-lucide="file-text"></i></div>
                <div class="doc-text">
                    <p class="doc-name">${doc.label}</p>
                    <p class="doc-sub" id="sub-${doc.id}">${isTextInput ? 'Enter ID number' : displayValue}</p>
                </div>
            </div>
            <div class="doc-actions">
                ${inputHtml}
            </div>
        `;
        
        container.appendChild(docEl);
    });
    lucide.createIcons();
}

function renderStep3() {
    const container = document.getElementById('review-content');
    container.innerHTML = '';

    // Info Summary
    const infoCard = document.createElement('div');
    infoCard.className = 'review-card';
    infoCard.innerHTML = `<h4>Information Summary</h4><div class="review-fields" id="review-fields-list"></div>`;
    container.appendChild(infoCard);

    const fieldsList = infoCard.querySelector('#review-fields-list');
    state.formConfig.sections.forEach(s => {
        s.fields.forEach(f => {
            const val = state.formData[f.id] || '-';
            fieldsList.innerHTML += `<div class="review-item"><p class="label">${f.label}</p><p class="value">${val}</p></div>`;
        });
    });

    // Docs Summary
    const docsCard = document.createElement('div');
    docsCard.className = 'review-card';
    docsCard.innerHTML = `<h4>Documents & IDs</h4><div class="review-fields" id="review-docs-list"></div>`;
    container.appendChild(docsCard);

    const docsList = docsCard.querySelector('#review-docs-list');
    state.formConfig.label.forEach(doc => {
        const isTextInput = doc.label.toLowerCase().includes("number") || doc.label.toLowerCase().includes("id");
        const val = isTextInput ? (state.formData[`doc_${doc.id}`] || '-') : (state.docFiles[doc.id]?.name || 'Not uploaded');
        docsList.innerHTML += `<div class="review-item"><p class="label">${doc.label}</p><p class="value">${val}</p></div>`;
    });

    // Fee
    if (state.formConfig.fees_enable) {
        const feeCard = document.createElement('div');
        feeCard.className = 'fee-card';
        feeCard.innerHTML = `
            <div class="fee-info">
                <h4>Application Fee</h4>
                <p class="fee-amount">₹${state.formConfig.fees}</p>
            </div>
            <div class="fee-icon"><i data-lucide="shield-check"></i></div>
        `;
        container.appendChild(feeCard);
    }
    lucide.createIcons();
}

// State Handlers
function updateData(key, value) {
    state.formData[key] = value;
}

function handleFileUpload(id, input) {
    const file = input.files[0];
    if (file) {
        state.docFiles[id] = file;
        document.getElementById(`sub-${id}`).textContent = file.name;
        const btn = input.nextElementSibling;
        if (btn) btn.innerHTML = `<i data-lucide="check"></i> Change`;
        lucide.createIcons();
    }
}

// Navigation Logic
function nextStep() {
    if (!validateCurrentStep()) return;

    if (state.currentStep === 1) {
        state.currentStep = 2;
        renderStep2();
    } else if (state.currentStep === 2) {
        state.currentStep = 3;
        renderStep3();
    }
    updateUI();
}

function prevStep() {
    if (state.currentStep > 1) {
        state.currentStep--;
        updateUI();
    }
}

function validateCurrentStep() {
    // Basic validation
    let isValid = true;
    if (state.currentStep === 1) {
        state.formConfig.sections.forEach(s => {
            s.fields.forEach(f => {
                if (f.is_required && !state.formData[f.id]) {
                    document.getElementById(`field-${f.id}`).style.borderColor = 'var(--error)';
                    isValid = false;
                } else if (document.getElementById(`field-${f.id}`)) {
                    document.getElementById(`field-${f.id}`).style.borderColor = 'var(--border)';
                }
            });
        });
    } else if (state.currentStep === 2) {
        state.formConfig.label.forEach(doc => {
            const isTextInput = doc.label.toLowerCase().includes("number") || doc.label.toLowerCase().includes("id");
            if (isTextInput && !state.formData[`doc_${doc.id}`]) isValid = false;
            else if (!isTextInput && !state.docFiles[doc.id]) isValid = false;
        });
    }
    
    if (!isValid) {
        Toastify({
            text: "Please complete all required fields.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            style: {
                background: "#ef4444",
            }
        }).showToast();
    }
    return isValid;
}

function updateUI() {
    // Progress
    const progress = (state.currentStep / 3) * 100;
    controls.progressBar.style.width = `${progress}%`;
    controls.stepBadge.textContent = `Step ${state.currentStep} of 3`;

    // Views
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[`step${state.currentStep}`].classList.remove('hidden');

    // Buttons
    controls.prevBtn.disabled = state.currentStep === 1;
    controls.nextBtn.classList.toggle('hidden', state.currentStep === 3);
    controls.submitBtn.classList.toggle('hidden', state.currentStep !== 3);
    
    window.scrollTo(0, 0);
}

function submitForm() {
    // Show success
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views.success.classList.remove('hidden');
    document.getElementById('form-footer').classList.add('hidden');
    controls.progressBar.parentElement.classList.add('hidden');

    // For backend dev: payload prepared here
    const payload = {
        form_id: state.formConfig.id,
        fields: state.formData,
        files: state.docFiles
    };
    console.log("Submitting to Django:", payload);
}

// Helpers
function hideLoading() {
    screens.loading.classList.add('hidden');
    screens.form.classList.remove('hidden');
}

function showError(msg) {
    console.error("Redirecting to error page:", msg);
    // Redirect to the new dedicated error page
    const errorUrl = new URL('./error-page/index.html', window.location.href);
    if (msg) errorUrl.searchParams.set('msg', msg);
    window.location.href = errorUrl.href;
}

// Launch
init();
