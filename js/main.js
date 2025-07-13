document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const newPatientNameInput = document.getElementById('new-patient-name');
    const addPatientButton = document.getElementById('add-patient-button');
    const patientListContainer = document.getElementById('patient-list');
    const appNav = document.getElementById('app-nav');
    const appContainer = document.getElementById('app-container');

    // === App Initializers ===
    const appInitializers = {
        app1: initializeChartSupportApp,
        app2: initializeDiagnosisSupportApp,
        app3: initializeBloodTestApp,
        app4: initializeIntegrationApp
    };
    const initializedApps = new Set();
    
// === Functions ===
    const switchApp = (targetId) => {
        document.querySelectorAll('.app-content.active').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-button.active').forEach(el => el.classList.remove('active'));
        
        const targetContainer = document.getElementById(targetId);
        // ★★★ 存在チェックを追加してエラーを防止 ★★★
        if (!targetContainer) return;

        targetContainer.classList.add('active');
        const targetButton = document.querySelector(`.nav-button[data-target="${targetId}"]`);
        if (targetButton) targetButton.classList.add('active');

        if (!initializedApps.has(targetId)) {
            if (appInitializers[targetId]) {
                appInitializers[targetId]();
            }
            initializedApps.add(targetId);
        }
        
        const patientData = PatientManager.getActivePatient();
        if (typeof targetContainer.load === 'function') {
            targetContainer.load(patientData);
        }
    };

    const startSessionForPatient = (patientId) => {
        PatientManager.setActivePatientId(patientId);
        const patient = PatientManager.getActivePatient();
        
        UIManager.updateActivePatientDisplay(patient);
        UIManager.showMainApp(true);
        
        switchApp('app1');
    };

    const refreshPatientList = () => {
        const patients = PatientManager.getPatients();
        UIManager.renderPatientList(patients);
    };

    // === Event Listeners ===
    addPatientButton.addEventListener('click', () => {
        const name = newPatientNameInput.value.trim();
        if (name) {
            const newPatient = PatientManager.createPatient(name);
            newPatientNameInput.value = '';
            selectPatient(newPatient.id);
        }
    });

    patientListContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.patient-item');
        if (item) {
            selectPatient(item.dataset.id);
        }
    });

    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'change-patient-button') {
            refreshPatientList();
            UIManager.showPatientModal(true);
        }
    });
    
    appNav.addEventListener('click', (e) => {
        if (e.target.matches('.nav-button:not(:disabled)')) {
            switchApp(e.target.dataset.target);
        }
    });

    // === Initial Load ===
    const activePatient = PatientManager.getActivePatient();
    if (activePatient) {
        selectPatient(activePatient.id);
    } else {
        refreshPatientList();
        UIManager.showPatientModal(true);
    }


    showPatientSelection();
});