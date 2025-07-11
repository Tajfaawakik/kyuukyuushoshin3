document.addEventListener('DOMContentLoaded', () => {

    // ===== Global App Navigation =====
    const navContainer = document.getElementById('app-nav');
    const contentContainers = document.querySelectorAll('.app-content');
    const navButtons = document.querySelectorAll('.nav-button');

    // App initializers mapping
    const appInitializers = {
        app1: initializeChartSupportApp,
        app2: initializeDiagnosisSupportApp,
        app3: initializeBloodTestApp
    };

    const initializedApps = new Set();

    function switchApp(targetId) {
        contentContainers.forEach(container => {
            container.classList.remove('active');
        });
        navButtons.forEach(button => {
            button.classList.remove('active');
        });

        document.getElementById(targetId).classList.add('active');
        document.querySelector(`.nav-button[data-target="${targetId}"]`).classList.add('active');

        // Initialize the app only on its first load
        if (!initializedApps.has(targetId)) {
            if (appInitializers[targetId]) {
                appInitializers[targetId]();
            }
            initializedApps.add(targetId);
        }
    }

    navContainer.addEventListener('click', (e) => {
        if (e.target.matches('.nav-button')) {
            const targetId = e.target.dataset.target;
            switchApp(targetId);
        }
    });

    // Initialize the first app by default
    switchApp('app1');
});