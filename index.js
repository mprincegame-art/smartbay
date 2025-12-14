let tenants = JSON.parse(localStorage.getItem('tenants')) || [];
        let editingId = null;
        let settings = JSON.parse(localStorage.getItem('settings')) || {
            theme: 'light',
            calendar: true,
            notifications: true
        };
        let notificationPermission = false;

        // Initialisation
        document.addEventListener('DOMContentLoaded', () => {
            loadSettings();
            renderTenants();
            requestNotificationPermission();
            checkExpiringTenants();
            
            document.getElementById('searchBar').addEventListener('input', (e) => {
                renderTenants(e.target.value);
            });

            // Vérifier les notifications toutes les heures
            setInterval(checkExpiringTenants, 3600000);
            // Vérifier aussi au chargement de la page
            setTimeout(checkExpiringTenants, 2000);
        });

        async function requestNotificationPermission() {
            if ('Notification' in window) {
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    notificationPermission = permission === 'granted';
                } else {
                    notificationPermission = Notification.permission === 'granted';
                }
            }
        }

        function showBrowserNotification(title, body) {
            if (!settings.notifications || !notificationPermission) return;
            
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, {
                    body: body,
                    icon: '🏠',
                    badge: '🔔'
                });
            }
        }

        function showToast(message) {
            const toast = document.getElementById('notificationToast');
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 4000);
        }

        function loadSettings() {
            document.body.setAttribute('data-theme', settings.theme);
            document.getElementById('themeToggle').classList.toggle('active', settings.theme === 'dark');
            document.getElementById('calendarToggle').classList.toggle('active', settings.calendar);
            document.getElementById('notifToggle').classList.toggle('active', settings.notifications);
        }

        function toggleTheme() {
            settings.theme = settings.theme === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', settings.theme);
            document.getElementById('themeToggle').classList.toggle('active', settings.theme === 'dark');
            localStorage.setItem('settings', JSON.stringify(settings));
            showToast(`Mode ${settings.theme === 'dark' ? 'sombre' : 'clair'} activé`);
        }

        function toggleCalendar() {
            settings.calendar = !settings.calendar;
            document.getElementById('calendarToggle').classList.toggle('active', settings.calendar);
            localStorage.setItem('settings', JSON.stringify(settings));
            showToast(settings.calendar ? '📅 Export calendrier activé' : '📅 Export calendrier désactivé');
        }

        async function toggleNotifications() {
            settings.notifications = !settings.notifications;
            document.getElementById('notifToggle').classList.toggle('active', settings.notifications);
            localStorage.setItem('settings', JSON.stringify(settings));
            
            if (settings.notifications && !notificationPermission) {
                await requestNotificationPermission();
                if (notificationPermission) {
                    showToast('🔔 Notifications activées');
                } else {
                    showToast('⚠️ Autorisation notifications refusée');
                    settings.notifications = false;
                    document.getElementById('notifToggle').classList.remove('active');
                }
            } else {
                showToast(settings.notifications ? '🔔 Notifications activées' : '🔔 Notifications désactivées');
            }
        }

        function openSettings() {
            document.getElementById('settingsModal').classList.add('active');
        }

        function closeSettings() {
            document.getElementById('settingsModal').classList.remove('active');
        }

        function openAddModal() {
            editingId = null;
            document.getElementById('modalTitle').textContent = 'Ajouter un locataire';
            document.getElementById('tenantForm').reset();
            document.getElementById('tenantModal').classList.add('active');
        }

        function openEditModal(id) {
            editingId = id;
            const tenant = tenants.find(t => t.id === id);
            if (tenant) {
                document.getElementById('modalTitle').textContent = 'Modifier le locataire';
                document.getElementById('tenantName').value = tenant.name;
                document.getElementById('tenantRent').value = tenant.rent;
                document.getElementById('tenantDuration').value = tenant.duration;
                document.getElementById('tenantStartDate').value = tenant.startDate;
                document.getElementById('tenantModal').classList.add('active');
            }
        }

        function closeModal() {
            document.getElementById('tenantModal').classList.remove('active');
            document.getElementById('tenantForm').reset();
            editingId = null;
        }

        function exportToCalendar(tenant) {
            if (!settings.calendar) {
                showToast('⚠️ Export calendrier désactivé dans les paramètres');
                return;
            }

            const startDate = new Date(tenant.startDate);
            const endDate = new Date(tenant.endDate);
            
            // Format dates pour iCal
            const formatDate = (date) => {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };

            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Gestion Locataires//FR',
                'CALNAME:Loyers',
                'BEGIN:VEVENT',
                `DTSTART:${formatDate(endDate)}`,
                `DTEND:${formatDate(new Date(endDate.getTime() + 24*60*60*1000))}`,
                `SUMMARY:Loyer ${tenant.name} - ${tenant.rent} FCFA`,
                `DESCRIPTION:Paiement du loyer pour ${tenant.name}\\nMontant : ${tenant.rent} FCFA\\nDurée : ${tenant.duration} mois`,
                `UID:${tenant.id}@gestion-locataires`,
                'STATUS:CONFIRMED',
                'BEGIN:VALARM',
                'TRIGGER:-P1D',
                'ACTION:DISPLAY',
                `DESCRIPTION:Rappel: Loyer de ${tenant.name} demain`,
                'END:VALARM',
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');

            // Créer et télécharger le fichier
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `loyer-${tenant.name.replace(/\s+/g, '-')}.ics`;
            link.click();
            
            showToast(`📅 Calendrier exporté pour ${tenant.name}`);
        }

        document.getElementById('tenantForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('tenantName').value;
            const rent = parseInt(document.getElementById('tenantRent').value);
            const duration = parseInt(document.getElementById('tenantDuration').value);
            const startDate = document.getElementById('tenantStartDate').value;
            
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + duration);
            
            if (editingId) {
                const index = tenants.findIndex(t => t.id === editingId);
                tenants[index] = {
                    ...tenants[index],
                    name,
                    rent,
                    duration,
                    startDate,
                    endDate: endDate.toISOString().split('T')[0]
                };
                showToast(`✅ ${name} modifié avec succès !`);
            } else {
                const newTenant = {
                    id: Date.now(),
                    name,
                    rent,
                    duration,
                    startDate,
                    endDate: endDate.toISOString().split('T')[0]
                };
                tenants.push(newTenant);
                showToast(`✅ ${name} ajouté avec succès !`);
                
                // Auto-export vers calendrier si activé
                if (settings.calendar) {
                    setTimeout(() => exportToCalendar(newTenant), 500);
                }
            }
            
            localStorage.setItem('tenants', JSON.stringify(tenants));
            closeModal();
            renderTenants();
        });

        function deleteTenant(id) {
            const tenant = tenants.find(t => t.id === id);
            if (confirm(`Êtes-vous sûr de vouloir supprimer ${tenant.name} ?`)) {
                tenants = tenants.filter(t => t.id !== id);
                localStorage.setItem('tenants', JSON.stringify(tenants));
                showToast(`🗑 Vous avez supprimé ${tenant.name} !`);
                renderTenants();
            }
        }

        function formatDate(dateString) {
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            const date = new Date(dateString);
            return `${date.getDate()} ${months[date.getMonth()]}`;
        }

        function formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        }

        function getDaysUntilExpiry(endDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(0, 0, 0, 0);
            return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        }

        function renderTenants(searchTerm = '') {
            const container = document.getElementById('tenantsContainer');
            const filtered = tenants.filter(t => 
                t.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filtered.length === 0) {
                container.innerHTML = '<div class="no-tenants">Aucun locataire trouvé</div>';
                return;
            }

            container.innerHTML = filtered.map((tenant, index) => {
                const daysLeft = getDaysUntilExpiry(tenant.endDate);
                let statusClass = '';
                let badge = '';

                if (daysLeft < 0) {
                    statusClass = 'expired';
                    badge = '<div class="alert-badge">⚠️ EXPIRÉ</div>';
                } else if (daysLeft <= 7) {
                    statusClass = 'expiring-soon';
                    badge = `<div class="warning-badge"><i class="fas fa-clock"</i> ${daysLeft}j restants</div>`;
                }

                return `
    <div class="tenant-card ${statusClass}">
                        ${badge}
  <div class="tenant-header">
   <div class="tenant-title">Locataire_${index + 1}</div>
  
  <div class="action-buttons">
    <button class="calendar-btn" onclick="exportToCalendar(${JSON.stringify(tenant).replace(/"/g, '&quot;')})"><i class="fas fa-calendar-alt"></i></button>
    
    <button class="edit-btn" onclick="openEditModal(${tenant.id})"><i class="fas fa-edit"></i></button>
  
    <button class="delete-btn" onclick="deleteTenant(${tenant.id})"><i class="fas fa-trash"></i></button>
    </div>
  </div>
    
   <div class="tenant-info">
    <p><span class="info-label"><i class="fas fa-user moon2"></i> Nom :</span> ${tenant.name}</p>
    
    <p><span class="info-label"><i class="fas fa-money-bill-wave moon2"></i> Loyer :</span> ${formatNumber(tenant.rent)} FCFA</p>
  
   <p><span class="info-label"><i class="fas fa-calendar-check moon2"></i> Durée :</span> ${tenant.duration} mois</p>
  
  <p><span class="info-label"><i class="fas fa-calendar-alt moon2"></i> Période :</span> ${formatDate(tenant.startDate)} - ${formatDate(tenant.endDate)}</p>
    </div>
  </div>
                `;
            }).join('');
        }

        function checkExpiringTenants() {
            if (!settings.notifications) return;

            const expiring = tenants.filter(t => {
                const days = getDaysUntilExpiry(t.endDate);
                return days >= 0 && days <= 7;
            });

            const expired = tenants.filter(t => getDaysUntilExpiry(t.endDate) < 0);

            if (expired.length > 0) {
                const names = expired.map(t => t.name).join(', ');
                showBrowserNotification(
                    '⚠️ Loyers expirés !',
                    `${expired.length} locataire(s) : ${names}`
                );
            }

            if (expiring.length > 0) {
                const names = expiring.map(t => `${t.name} (${getDaysUntilExpiry(t.endDate)}j)`).join(', ');
                showBrowserNotification(
                    '⏰ Loyers à renouveler bientôt',
                    `${expiring.length} locataire(s) : ${names}`
                );
            }
        }

        // Fermer les modaux en cliquant à l'extérieur
        window.onclick = (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('settings-modal')) {
                e.target.classList.remove('active');
            }
        };
        
        if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}