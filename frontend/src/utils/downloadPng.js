const roundedRect = (context, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
};

const wrapText = (context, value, maxWidth) => {
  const words = String(value || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

const drawWrappedText = (context, value, x, y, maxWidth, lineHeight, maxLines = 3) => {
  const lines = wrapText(context, value, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
};

const drawField = (context, label, value, x, y, width) => {
  context.fillStyle = '#9ca3af';
  context.font = '600 14px Arial, sans-serif';
  context.fillText(label.toUpperCase(), x, y);
  context.fillStyle = '#f9fafb';
  context.font = '600 21px Arial, sans-serif';
  drawWrappedText(context, value || 'Not available', x, y + 34, width, 27, 2);
};

const formatDate = value => {
  if (!value) return 'Date to be confirmed';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date to be confirmed'
    : date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMoney = value => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value) || 0);

const drawSeatChips = (context, seats, x, y, maxWidth) => {
  if (!seats.length) return y;
  let chipX = x;
  let chipY = y;
  const height = 38;
  context.font = '700 16px Arial, sans-serif';
  for (const seat of seats) {
    const label = typeof seat === 'string' ? seat : `${seat.seatId}${seat.seatType ? ` (${seat.seatType})` : ''}`;
    const width = Math.min(context.measureText(label).width + 28, maxWidth);
    if (chipX + width > x + maxWidth) {
      chipX = x;
      chipY += height + 10;
    }
    roundedRect(context, chipX, chipY, width, height, 8);
    context.fillStyle = 'rgba(229, 9, 20, 0.13)';
    context.fill();
    context.strokeStyle = 'rgba(229, 9, 20, 0.55)';
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = '#fecaca';
    context.fillText(label, chipX + 14, chipY + 24);
    chipX += width + 10;
  }
  return chipY + height;
};

const countSeatRows = (context, seats, maxWidth) => {
  if (!seats?.length) return 0;
  context.font = '700 16px Arial, sans-serif';
  let rows = 1;
  let rowWidth = 0;
  for (const seat of seats) {
    const label = typeof seat === 'string' ? seat : `${seat.seatId}${seat.seatType ? ` (${seat.seatType})` : ''}`;
    const chipWidth = Math.min(context.measureText(label).width + 28, maxWidth);
    if (rowWidth && rowWidth + chipWidth > maxWidth) {
      rows += 1;
      rowWidth = 0;
    }
    rowWidth += chipWidth + 10;
  }
  return rows;
};

const loadInlineQr = async value => {
  if (!value?.startsWith('data:image/png;base64,')) return null;
  const image = new Image();
  image.src = value;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Could not load the ticket QR code.'));
  });
  return image;
};

export const downloadBookingTicketAsPng = async (booking, fileName = 'cineverse-ticket.png') => {
  if (!booking) throw new Error('Ticket is not ready to download.');

  const width = 900;
  const padding = 54;
  const innerWidth = width - padding * 2;
  const title = booking.movie?.title || booking.event?.name || 'CineVerse Ticket';
  const date = booking.bookingType === 'EVENT' ? booking.event?.date : booking.show?.showDate;
  const time = booking.bookingType === 'EVENT' ? booking.event?.startTime : booking.show?.startTime;
  const qrImage = await loadInlineQr(booking.qrCode);

  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  if (!measureContext) throw new Error('Could not create the ticket image.');
  measureContext.font = '700 36px Arial, sans-serif';
  const titleLines = wrapText(measureContext, title, innerWidth - 12).slice(0, 2);
  const titleHeight = Math.max(1, titleLines.length) * 44;
  const fieldsTop = padding + 150 + titleHeight + 34;
  let contentBottom = fieldsTop + 228;

  const hasTickets = booking.ticketItems?.length > 0;
  const hasSeats = booking.seats?.length > 0;
  const seatRows = countSeatRows(measureContext, booking.seats || [], innerWidth);
  if (hasSeats || hasTickets) contentBottom += 42 + (hasSeats ? seatRows * 48 : booking.ticketItems.length * 34 + 12);
  const footerTop = contentBottom + 34;
  const height = footerTop + 216 + padding;

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the ticket image.');
  context.scale(scale, scale);

  context.fillStyle = '#101114';
  context.fillRect(0, 0, width, height);
  roundedRect(context, 28, 28, width - 56, height - 56, 24);
  context.fillStyle = '#1b1c20';
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,.12)';
  context.lineWidth = 1;
  context.stroke();

  const headerX = 28;
  const headerY = 28;
  const headerWidth = width - 56;
  const headerHeight = 150;
  roundedRect(context, headerX, headerY, headerWidth, headerHeight, 24);
  const headerGradient = context.createLinearGradient(headerX, headerY, headerX + headerWidth, headerY + headerHeight);
  const cancelled = booking.bookingStatus === 'CANCELLED';
  headerGradient.addColorStop(0, cancelled ? '#7f1d1d' : '#166534');
  headerGradient.addColorStop(1, cancelled ? '#991b1b' : '#15803d');
  context.fillStyle = headerGradient;
  context.fill();
  context.fillStyle = 'rgba(255,255,255,.8)';
  context.font = '600 16px Arial, sans-serif';
  context.fillText('CINEVERSE TICKET', padding, 72);
  context.fillStyle = '#ffffff';
  context.font = '800 29px Arial, sans-serif';
  context.fillText(`#${booking.bookingId || 'BOOKING'}`, padding, 116);
  context.textAlign = 'right';
  context.font = '700 17px Arial, sans-serif';
  context.fillText(cancelled ? 'CANCELLED' : (booking.paymentStatus || 'CONFIRMED'), width - padding, 87);
  context.textAlign = 'left';

  let titleY = padding + headerHeight + 54;
  context.fillStyle = '#ffffff';
  context.font = '700 36px Arial, sans-serif';
  titleLines.forEach(line => {
    context.fillText(line, padding, titleY);
    titleY += 44;
  });

  const columnGap = 38;
  const columnWidth = (innerWidth - columnGap) / 2;
  const rowOneY = fieldsTop;
  const rowTwoY = fieldsTop + 112;
  drawField(context, 'Venue', booking.venue?.name || booking.event?.location || 'Venue to be confirmed', padding, rowOneY, columnWidth);
  drawField(context, 'Date', formatDate(date), padding + columnWidth + columnGap, rowOneY, columnWidth);
  drawField(context, 'Time', time || 'Time to be confirmed', padding, rowTwoY, columnWidth);
  drawField(context, 'Amount paid', formatMoney(booking.totalAmount), padding + columnWidth + columnGap, rowTwoY, columnWidth);

  context.strokeStyle = 'rgba(255,255,255,.14)';
  context.setLineDash([7, 7]);
  context.beginPath();
  context.moveTo(padding, fieldsTop + 218);
  context.lineTo(width - padding, fieldsTop + 218);
  context.stroke();
  context.setLineDash([]);

  let sectionY = fieldsTop + 258;
  if (hasSeats) {
    context.fillStyle = '#9ca3af';
    context.font = '600 14px Arial, sans-serif';
    context.fillText('SEATS', padding, sectionY);
    sectionY = drawSeatChips(context, booking.seats, padding, sectionY + 16, innerWidth);
  } else if (hasTickets) {
    context.fillStyle = '#9ca3af';
    context.font = '600 14px Arial, sans-serif';
    context.fillText('TICKETS', padding, sectionY);
    sectionY += 26;
    booking.ticketItems.forEach(item => {
      context.fillStyle = '#f9fafb';
      context.font = '600 17px Arial, sans-serif';
      context.fillText(`${item.categoryName} x ${item.quantity}`, padding, sectionY);
      context.textAlign = 'right';
      context.fillStyle = '#fbbf24';
      context.fillText(formatMoney(item.price * item.quantity), width - padding, sectionY);
      context.textAlign = 'left';
      sectionY += 34;
    });
  }

  const finalFooterY = Math.max(footerTop, sectionY + 28);
  context.fillStyle = '#9ca3af';
  context.font = '600 14px Arial, sans-serif';
  context.fillText('BOOKING ID', padding, finalFooterY + 18);
  context.fillStyle = '#ffffff';
  context.font = '700 19px Arial, sans-serif';
  context.fillText(booking.bookingId || '—', padding, finalFooterY + 48);
  context.fillStyle = '#9ca3af';
  context.font = '600 14px Arial, sans-serif';
  context.fillText('PAYMENT REFERENCE', padding, finalFooterY + 88);
  context.fillStyle = '#e5e7eb';
  context.font = '16px Arial, sans-serif';
  drawWrappedText(context, booking.razorpayPaymentId || booking.paymentStatus || 'Payment details', padding, finalFooterY + 116, 390, 23, 2);

  if (qrImage) {
    const qrSize = 168;
    const qrX = width - padding - qrSize;
    const qrY = finalFooterY - 6;
    roundedRect(context, qrX - 9, qrY - 9, qrSize + 18, qrSize + 18, 12);
    context.fillStyle = '#ffffff';
    context.fill();
    context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    context.fillStyle = '#9ca3af';
    context.font = '600 11px Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText('SCAN AT THE ENTRANCE', qrX + qrSize / 2, qrY + qrSize + 29);
    context.textAlign = 'left';
  }

  const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!png) throw new Error('Could not create the PNG file.');

  const downloadUrl = URL.createObjectURL(png);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName.replace(/[^a-z0-9._-]/gi, '_').replace(/\.(png|jpe?g)$/i, '') + '.png';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};
