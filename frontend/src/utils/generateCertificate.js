import { jsPDF } from 'jspdf';

// ── Palette ──────────────────────────────────────────
const G_DARK  = [22,  78,  48];
const G_MID   = [46,  139, 87];
const G_LIGHT = [236, 247, 240];
const GOLD    = [183, 144, 46];
const GOLD_LT = [245, 220, 130];
const WHITE   = [255, 255, 255];
const GRAY    = [110, 110, 110];
const GRAY_LT = [170, 170, 170];

// ── Cert ID hash ─────────────────────────────────────
function certId(donorName, itemName, date) {
  const s = `${donorName}${itemName}${date}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return `DON-${Math.abs(h).toString(16).toUpperCase().padStart(8, '0')}`;
}

// ── Heart shape (no emoji) ───────────────────────────
function drawHeart(doc, cx, cy, size, color) {
  doc.setFillColor(...color);
  const r = size * 0.3;
  doc.circle(cx - r, cy - r * 0.15, r, 'F');
  doc.circle(cx + r, cy - r * 0.15, r, 'F');
  doc.triangle(cx - size * 0.58, cy + r * 0.2, cx + size * 0.58, cy + r * 0.2, cx, cy + size * 0.65, 'F');
}

// ── Diamond ornament ─────────────────────────────────
function diamond(doc, x, y, r) {
  doc.setFillColor(...GOLD);
  doc.triangle(x, y - r, x + r, y, x, y + r, 'F');
  doc.triangle(x, y - r, x - r, y, x, y + r, 'F');
}

// ── Ornament row (diamonds + lines) ─────────────────
function ornamentRow(doc, y, W) {
  const span = 90;
  diamond(doc, W / 2, y, 2.8);
  diamond(doc, W / 2 - span - 4, y, 1.6);
  diamond(doc, W / 2 + span + 4, y, 1.6);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.55);
  doc.line(W / 2 - span, y, W / 2 - 7, y);
  doc.line(W / 2 + 7,    y, W / 2 + span, y);
}

// ── Corner bracket ───────────────────────────────────
function cornerBracket(doc, x, y, sx, sy, len) {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + sx * len, y);
  doc.line(x, y, x, y + sy * len);
  doc.setLineWidth(0.25);
  doc.line(x + sx * 3, y + sy * 3, x + sx * (len - 1), y + sy * 3);
  doc.line(x + sx * 3, y + sy * 3, x + sx * 3, y + sy * (len - 1));
}

export function downloadCertificate({ donorName, itemName, receiverName, donatedAt, adminName = 'Donateo Admin' }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 297
  const H = doc.internal.pageSize.getHeight();  // 210

  // ── 1. Mint background ────────────────────────────
  doc.setFillColor(...G_LIGHT);
  doc.rect(0, 0, W, H, 'F');

  // Subtle diagonal lines
  doc.setDrawColor(205, 232, 215);
  doc.setLineWidth(0.15);
  for (let i = -H; i < W + H; i += 14) {
    doc.line(i, 0, i + H, H);
  }

  // ── 2. Dark green top + bottom bars ──────────────
  doc.setFillColor(...G_DARK);
  doc.rect(0, 0, W, 16, 'F');
  doc.rect(0, H - 16, W, 16, 'F');

  // ── 3. Outer border ───────────────────────────────
  doc.setDrawColor(...G_DARK);
  doc.setLineWidth(2);
  doc.rect(7, 7, W - 14, H - 14);

  // ── 4. Gold inner border ──────────────────────────
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.rect(11, 20, W - 22, H - 40);

  // ── 5. Corner brackets ────────────────────────────
  const cl = 13;
  cornerBracket(doc, 11,     20,      +1, +1, cl);
  cornerBracket(doc, W - 11, 20,      -1, +1, cl);
  cornerBracket(doc, 11,     H - 20,  +1, -1, cl);
  cornerBracket(doc, W - 11, H - 20,  -1, -1, cl);

  // ── 6. Header — heart + "DONATEO" | separator | "CERTIFICATE OF DONATION" ──
  // Heart
  drawHeart(doc, W / 2 - 72, 9, 5, WHITE);

  // "DONATEO" — tracked spacing
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setCharSpace(3.5);
  doc.text('DONATEO', W / 2 - 63, 12.5);
  doc.setCharSpace(0);

  // Gold vertical separator
  doc.setDrawColor(...GOLD_LT);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 14, 4, W / 2 - 14, 14);

  // "CERTIFICATE OF DONATION"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setCharSpace(1.8);
  doc.text('CERTIFICATE  OF  DONATION', W / 2 - 8, 12.5);
  doc.setCharSpace(0);

  // ── 7. Top ornament row ───────────────────────────
  ornamentRow(doc, 29, W);

  // ── 8. "This is to proudly certify that" ─────────
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10.5);
  doc.text('This is to proudly certify that', W / 2, 40, { align: 'center' });

  // ── 9. Donor name ─────────────────────────────────
  doc.setTextColor(...G_DARK);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(36);
  doc.setCharSpace(0); // IMPORTANT: reset before name
  doc.text(donorName, W / 2, 60, { align: 'center' });

  // Double gold underline
  const nw = doc.getTextWidth(donorName);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.9);
  doc.line(W / 2 - nw / 2, 63, W / 2 + nw / 2, 63);
  doc.setLineWidth(0.28);
  doc.line(W / 2 - nw / 2 + 3, 65.5, W / 2 + nw / 2 - 3, 65.5);

  // ── 10. "has generously donated" ─────────────────
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10.5);
  doc.text('has generously donated', W / 2, 75, { align: 'center' });

  // ── 11. Item name pill ────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setCharSpace(0);
  const itemLabel = `"${itemName}"`;
  const iw  = doc.getTextWidth(itemLabel);
  const pillW = Math.max(80, iw + 22);
  const pillX = W / 2 - pillW / 2;
  const pillY = 79;

  // Shadow
  doc.setFillColor(175, 215, 190);
  doc.roundedRect(pillX + 1.2, pillY + 1.2, pillW, 13, 4, 4, 'F');
  // White fill + green border
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...G_MID);
  doc.setLineWidth(1);
  doc.roundedRect(pillX, pillY, pillW, 13, 4, 4, 'FD');
  // Gold inner border
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.roundedRect(pillX + 1.8, pillY + 1.8, pillW - 3.6, 9.4, 2.5, 2.5, 'D');

  doc.setTextColor(...G_DARK);
  doc.text(itemLabel, W / 2, pillY + 9, { align: 'center' });

  // ── 12. "to" ──────────────────────────────────────
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10.5);
  doc.text('to', W / 2, 103, { align: 'center' });

  // ── 13. Receiver name — NO letter spacing ─────────
  doc.setTextColor(...G_DARK);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(22);
  doc.setCharSpace(0);
  doc.text(receiverName, W / 2, 114, { align: 'center' });

  // ── 14. Platform line ─────────────────────────────
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.text('through the Donateo Community Donation Platform', W / 2, 124, { align: 'center' });

  // ── 15. Bottom ornament row ───────────────────────
  ornamentRow(doc, 131, W);

  // ── 16. Footer — 3 columns: date | logo | signature ──
  const footerY = 148;

  // Left: date + cert id
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Date of Donation:', 22, footerY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...G_DARK);
  const dateStr = donatedAt
    ? new Date(donatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(dateStr, 22, footerY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_LT);
  doc.text(`Certificate ID: ${certId(donorName, itemName, dateStr)}`, 22, footerY + 14);

  // Centre: circular logo badge
  const lcx = W / 2;
  const lcy = footerY + 6;
  // Outer gold ring
  doc.setDrawColor(...GOLD);
  doc.setFillColor(...WHITE);
  doc.setLineWidth(0.8);
  doc.circle(lcx, lcy, 13, 'FD');
  // Inner green fill
  doc.setFillColor(...G_DARK);
  doc.circle(lcx, lcy, 10.5, 'F');
  // Heart inside
  drawHeart(doc, lcx, lcy - 0.5, 7, WHITE);
  // "DONATEO" text inside badge — no char spacing to prevent overflow
  doc.setTextColor(...GOLD_LT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setCharSpace(0);
  doc.text('DONATEO', lcx, lcy + 7, { align: 'center' });
  // Gold tick marks left and right of circle
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(lcx - 15, lcy, lcx - 12, lcy);
  doc.line(lcx + 12, lcy, lcx + 15, lcy);

  // Right: signature
  const sigX = W - 22;
  const sigLineY = footerY + 10;
  doc.setDrawColor(...G_DARK);
  doc.setLineWidth(0.5);
  doc.line(sigX - 52, sigLineY, sigX, sigLineY);

  doc.setTextColor(...G_DARK);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(13);
  doc.text(adminName, sigX - 26, sigLineY - 3, { align: 'center' });

  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Authorised Signatory, Donateo', sigX - 26, sigLineY + 5, { align: 'center' });

  // ── 17. Bottom bar — heart + text centered together ─
  const footerText = 'Thank you for making a difference in someone\'s life  —  www.donateo.app';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setCharSpace(0.4);
  const ftw = doc.getTextWidth(footerText);
  const ftx = W / 2 - ftw / 2;  // left edge of text
  // Draw heart just to the left of text, vertically centered
  drawHeart(doc, ftx - 6, H - 7.5, 4, GOLD_LT);
  doc.setTextColor(...GOLD_LT);
  doc.text(footerText, W / 2, H - 5.5, { align: 'center' });
  doc.setCharSpace(0);

  // ── Save ─────────────────────────────────────────
  doc.save(`Donateo_Certificate_${donorName.replace(/\s+/g, '_')}_${itemName.replace(/\s+/g, '_')}.pdf`);
}