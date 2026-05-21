const fs = require('fs');

const cssApp = `
/* ── MOBILE RESPONSIVENESS (App.css) ── */
@media (max-width: 768px) {
  .navbar { padding: 0 20px; }
  .nav-links {
    display: none;
    flex-direction: column;
    position: absolute;
    top: 64px;
    left: 0;
    right: 0;
    background: var(--surface);
    padding: 20px;
    text-align: center;
    box-shadow: var(--shadow-md);
  }
  .nav-links.open { display: flex; align-items: center; justify-content: center; }
  .hamburger { display: flex; }
  
  .hero { padding: 40px 20px 0; text-align: center; }
  .hero-top { text-align: center; display: flex; flex-direction: column; align-items: center; }
  .hero h1 { font-size: 2.2rem; }
  .booking-widget { margin: 20px 0 0; }
  .booking-fields { grid-template-columns: 1fr; align-items: center; text-align: center; }
  .bfield { text-align: center; width: 100%; align-items: center; }
  .bfield select, .bfield input, .search-btn { width: 100%; justify-content: center; }
  
  .section { padding: 40px 20px; text-align: center; }
  .section-head { flex-direction: column; align-items: center; text-align: center; justify-content: center; }
  
  .space-grid, .why-grid, .review-grid { grid-template-columns: 1fr; gap: 20px; }
  .space-card, .why-card, .review-card { margin: 0 auto; width: 100%; max-width: 400px; text-align: center; }
  .space-body, .space-cta { text-align: center; flex-direction: column; align-items: center; gap: 10px; }
  .space-tags { justify-content: center; }
  
  .stats-row { grid-template-columns: 1fr 1fr; margin-top: 30px; }
  
  .cta-banner { flex-direction: column; text-align: center; padding: 30px 20px; margin: 0 20px 40px; align-items: center; justify-content: center; }
  .cta-banner::before { top: 0; left: 0; right: 0; width: 100%; height: 100%; }
  
  footer { padding: 40px 20px 20px; text-align: center; }
  .footer-grid { grid-template-columns: 1fr; text-align: center; gap: 30px; justify-items: center; align-items: center; }
  .footer-col, .footer-brand { display: flex; flex-direction: column; align-items: center; text-align: center; }
  .footer-bottom { flex-direction: column; text-align: center; gap: 10px; justify-content: center; }
}
`;

fs.appendFileSync('src/App.css', cssApp);

const cssLogin = `
/* ── MOBILE RESPONSIVENESS (login.css) ── */
@media (max-width: 768px) {
  .lp-page { flex-direction: column; }
  .lp-left { display: none; } /* Hide left panel on mobile to save space */
  .lp-right { width: 100%; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .lp-form-container { width: 100%; max-width: 400px; margin: 0 auto; text-align: center; }
  .lp-input-group label, .lp-input-group input { text-align: center; }
  .lp-brand-mobile { display: block; margin-bottom: 20px; text-align: center; }
}
`;
fs.appendFileSync('src/login.css', cssLogin);

const cssDashboard = `
/* ── MOBILE RESPONSIVENESS (Dashboard.css) ── */
@media (max-width: 768px) {
  .db-page { flex-direction: column; }
  .db-sidebar { width: 100%; height: auto; border-right: none; border-bottom: 1px solid var(--border); padding: 15px; display: flex; flex-direction: column; align-items: center; }
  .db-sidebar-logo { margin-bottom: 15px; justify-content: center; }
  .db-sidenav { flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 10px; }
  .db-main { padding: 20px; text-align: center; }
  .db-header { flex-direction: column; gap: 15px; align-items: center; text-align: center; }
  .db-bookings { grid-template-columns: 1fr; align-items: center; }
  .db-bcard { margin: 0 auto; width: 100%; max-width: 400px; text-align: center; }
  .db-bcard-top, .db-bcard-mid, .db-bcard-bot { flex-direction: column; align-items: center; text-align: center; gap: 10px; }
}
`;
fs.appendFileSync('src/Dashboard.css', cssDashboard);

const cssAdmin = `
/* ── MOBILE RESPONSIVENESS (AdminDashboard.css) ── */
@media (max-width: 768px) {
  .adm-page { flex-direction: column; }
  .adm-sidebar { width: 100%; height: auto; padding: 15px; border-right: none; border-bottom: 1px solid var(--border); }
  .adm-sidebar-logo { justify-content: center; margin-bottom: 15px; }
  .adm-sidenav { flex-direction: row; flex-wrap: wrap; justify-content: center; }
  .adm-main { padding: 20px; text-align: center; }
  .adm-header { flex-direction: column; gap: 15px; align-items: center; text-align: center; }
  .adm-stats { grid-template-columns: 1fr; }
  .adm-table-wrap { overflow-x: auto; }
  .adm-table th, .adm-table td { text-align: center; }
  .adm-actions { justify-content: center; }
  .adm-chart-row { grid-template-columns: 1fr; }
}
`;
fs.appendFileSync('src/AdminDashboard.css', cssAdmin);

const cssBooking = `
/* ── MOBILE RESPONSIVENESS (Booking.css) ── */
@media (max-width: 768px) {
  .bk-page { padding: 20px; }
  .bk-header { flex-direction: column; gap: 15px; align-items: center; text-align: center; }
  .bk-content { flex-direction: column; }
  .bk-main { padding: 20px; text-align: center; }
  .bk-side { width: 100%; border-left: none; border-top: 1px solid var(--border); }
  .bk-spaces { grid-template-columns: 1fr; }
  .bk-space-card { text-align: center; margin: 0 auto; max-width: 400px; }
  .bk-space-card-body { text-align: center; }
  .bk-nav { justify-content: center; }
  .bk-slots { justify-content: center; }
}
`;
fs.appendFileSync('src/Booking.css', cssBooking);

console.log('CSS Appended Successfully');
