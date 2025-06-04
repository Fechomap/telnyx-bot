// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.config = {};
        this.init();
    }

    init() {
        this.loadConfig();
        this.setupEventListeners();
        this.startStatusUpdates();
    }

    setupEventListeners() {
        // Auto-save on changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('input, select')) {
                this.markConfigChanged();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveAllConfig();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.loadConfig();
                        break;
                }
            }
        });
    }

    async loadConfig() {
        try {
            this.showLoading(true);
            const response = await fetch('/admin/config');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.config = await response.json();
            this.populateForm();
            this.showAlert('Configuración cargada exitosamente', 'success');
        } catch (error) {
            console.error('Error loading config:', error);
            this.showAlert(`Error al cargar configuración: ${error.message}`, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    populateForm() {
        // IVR Configuration
        document.getElementById('ivrOptimizedMode').checked = this.config.IVR_OPTIMIZED_MODE === 'true';
        document.getElementById('transferEnabled').checked = this.config.TRANSFER_ENABLED === 'true';
        document.getElementById('telnyxCallerId').value = this.config.TELNYX_CALLER_ID || '';

        // Phone Numbers
        this.populateAgentNumbers(this.config.AGENT_NUMBER);
        document.getElementById('option2TransferNumber').value = this.config.OPTION2_TRANSFER_NUMBER || '';
        document.getElementById('option2BlockedNumber').value = this.config.OPTION2_BLOCKED_TRANSFER_NUMBER || '';

        // Option 2 Configuration
        document.getElementById('option2TransferMode').checked = this.config.OPTION2_TRANSFER_MODE === 'true';
        this.populateAllowedNumbers(this.config.OPTION2_ALLOWED_NUMBERS);

        // API Configuration
        document.getElementById('apiBaseUrl').value = this.config.API_BASE_URL || '';
        document.getElementById('webhookBaseUrl').value = this.config.WEBHOOK_BASE_URL || '';
        document.getElementById('telnyxConnectionId').value = this.config.TELNYX_CONNECTION_ID || '';

        // OpenAI Configuration
        document.getElementById('openaiAssistantId').value = this.config.OPENAI_ASSISTANT_ID || '';
        document.getElementById('openaiTimeout').value = this.config.OPENAI_TIMEOUT || '30000';
    }

    populateAgentNumbers(numbersString) {
        const container = document.getElementById('agentNumbers');
        container.innerHTML = '';
        
        if (numbersString) {
            const numbers = numbersString.split(',').map(n => n.trim()).filter(n => n);
            numbers.forEach(number => {
                this.createNumberTag(container, number, 'removeAgentNumber');
            });
        }
    }

    populateAllowedNumbers(numbersString) {
        const container = document.getElementById('allowedNumbers');
        container.innerHTML = '';
        
        if (numbersString) {
            const numbers = numbersString.split(',').map(n => n.trim()).filter(n => n);
            numbers.forEach(number => {
                this.createNumberTag(container, number, 'removeAllowedNumber');
            });
        }
    }

    createNumberTag(container, number, removeFunction) {
        const tag = document.createElement('span');
        tag.className = 'number-tag';
        tag.innerHTML = `
            ${number}
            <i class="fas fa-times ms-2" style="cursor: pointer;" onclick="adminPanel.${removeFunction}('${number}')"></i>
        `;
        container.appendChild(tag);
    }

    addAgentNumber() {
        const number = prompt('Ingrese el número de agente (ej: +525534698379):');
        if (number && this.validatePhoneNumber(number)) {
            const container = document.getElementById('agentNumbers');
            this.createNumberTag(container, number.trim(), 'removeAgentNumber');
            this.markConfigChanged();
        } else if (number) {
            this.showAlert('Formato de número inválido', 'warning');
        }
    }

    addAllowedNumber() {
        const number = prompt('Ingrese el número permitido (ej: 5558 o +525615521342):');
        if (number && number.trim()) {
            const container = document.getElementById('allowedNumbers');
            this.createNumberTag(container, number.trim(), 'removeAllowedNumber');
            this.markConfigChanged();
        }
    }

    removeAgentNumber(number) {
        const container = document.getElementById('agentNumbers');
        const tags = container.querySelectorAll('.number-tag');
        tags.forEach(tag => {
            if (tag.textContent.trim().startsWith(number)) {
                tag.remove();
            }
        });
        this.markConfigChanged();
    }

    removeAllowedNumber(number) {
        const container = document.getElementById('allowedNumbers');
        const tags = container.querySelectorAll('.number-tag');
        tags.forEach(tag => {
            if (tag.textContent.trim().startsWith(number)) {
                tag.remove();
            }
        });
        this.markConfigChanged();
    }

    validatePhoneNumber(number) {
        // Basic phone number validation
        const phoneRegex = /^(\+\d{1,3})?[\d\s\-\(\)]{7,15}$/;
        return phoneRegex.test(number.replace(/\s/g, ''));
    }

    getAgentNumbers() {
        const container = document.getElementById('agentNumbers');
        const tags = container.querySelectorAll('.number-tag');
        return Array.from(tags).map(tag => 
            tag.textContent.trim().replace(/\s*×\s*$/, '')
        ).join(',');
    }

    getAllowedNumbers() {
        const container = document.getElementById('allowedNumbers');
        const tags = container.querySelectorAll('.number-tag');
        return Array.from(tags).map(tag => 
            tag.textContent.trim().replace(/\s*×\s*$/, '')
        ).join(',');
    }

    async saveAllConfig() {
        try {
            this.showLoading(true);
            
            const newConfig = {
                IVR_OPTIMIZED_MODE: document.getElementById('ivrOptimizedMode').checked.toString(),
                TRANSFER_ENABLED: document.getElementById('transferEnabled').checked.toString(),
                TELNYX_CALLER_ID: document.getElementById('telnyxCallerId').value,
                AGENT_NUMBER: this.getAgentNumbers(),
                OPTION2_TRANSFER_NUMBER: document.getElementById('option2TransferNumber').value,
                OPTION2_BLOCKED_TRANSFER_NUMBER: document.getElementById('option2BlockedNumber').value,
                OPTION2_TRANSFER_MODE: document.getElementById('option2TransferMode').checked.toString(),
                OPTION2_ALLOWED_NUMBERS: this.getAllowedNumbers(),
                API_BASE_URL: document.getElementById('apiBaseUrl').value,
                WEBHOOK_BASE_URL: document.getElementById('webhookBaseUrl').value,
                TELNYX_CONNECTION_ID: document.getElementById('telnyxConnectionId').value,
                OPENAI_ASSISTANT_ID: document.getElementById('openaiAssistantId').value,
                OPENAI_TIMEOUT: document.getElementById('openaiTimeout').value
            };

            const response = await fetch('/admin/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newConfig)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            this.showAlert('Configuración guardada exitosamente', 'success');
            this.markConfigSaved();

        } catch (error) {
            console.error('Error saving config:', error);
            this.showAlert(`Error al guardar configuración: ${error.message}`, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async testSystem() {
        try {
            this.showLoading(true);
            const response = await fetch('/admin/test-system');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert('Sistema funcionando correctamente', 'success');
            } else {
                this.showAlert(`Problemas detectados: ${result.message}`, 'warning');
            }
        } catch (error) {
            console.error('Error testing system:', error);
            this.showAlert(`Error al probar sistema: ${error.message}`, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async restartSystem() {
        if (!confirm('¿Está seguro de que desea reiniciar el sistema? Esto interrumpirá las llamadas activas.')) {
            return;
        }

        try {
            this.showLoading(true);
            const response = await fetch('/admin/restart', { method: 'POST' });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.showAlert('Sistema reiniciado exitosamente', 'success');
            
            // Esperar un momento y recargar la página
            setTimeout(() => {
                window.location.reload();
            }, 3000);
            
        } catch (error) {
            console.error('Error restarting system:', error);
            this.showAlert(`Error al reiniciar sistema: ${error.message}`, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async loadSystemStatus() {
        try {
            const response = await fetch('/admin/status');
            
            if (response.ok) {
                const status = await response.json();
                this.updateSystemStatus(status);
            }
        } catch (error) {
            console.error('Error loading system status:', error);
        }
    }

    updateSystemStatus(status) {
        document.getElementById('systemUptime').textContent = status.uptime || '--';
        document.getElementById('totalCalls').textContent = status.totalCalls || '--';
    }

    startStatusUpdates() {
        // Cargar estado inicial
        this.loadSystemStatus();
        
        // Actualizar cada 30 segundos
        setInterval(() => {
            this.loadSystemStatus();
        }, 30000);
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'flex' : 'none';
    }

    showAlert(message, type = 'info') {
        const container = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();
        
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
                <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', alertHtml);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            danger: 'exclamation-triangle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    markConfigChanged() {
        // Visual feedback that config has changed
        const saveBtn = document.querySelector('button[onclick="saveAllConfig()"]');
        if (saveBtn && !saveBtn.classList.contains('btn-warning')) {
            saveBtn.classList.remove('btn-success');
            saveBtn.classList.add('btn-warning');
            saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Guardar Cambios';
        }
    }

    markConfigSaved() {
        const saveBtn = document.querySelector('button[onclick="saveAllConfig()"]');
        if (saveBtn) {
            saveBtn.classList.remove('btn-warning');
            saveBtn.classList.add('btn-success');
            saveBtn.innerHTML = '<i class="fas fa-check me-2"></i>Guardado';
            
            setTimeout(() => {
                saveBtn.classList.remove('btn-success');
                saveBtn.classList.add('btn-success');
                saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Guardar Todo';
            }, 2000);
        }
    }
}

// Global functions for onclick handlers
let adminPanel;

function loadConfig() {
    adminPanel.loadConfig();
}

function saveAllConfig() {
    adminPanel.saveAllConfig();
}

function testSystem() {
    adminPanel.testSystem();
}

function restartSystem() {
    adminPanel.restartSystem();
}

function addAgentNumber() {
    adminPanel.addAgentNumber();
}

function addAllowedNumber() {
    adminPanel.addAllowedNumber();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});