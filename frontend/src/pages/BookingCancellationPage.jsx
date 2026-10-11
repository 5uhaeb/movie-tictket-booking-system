import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, Clock3, LoaderCircle, XCircle } from 'lucide-react';
import api from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { getScheduledStart } from '../utils/schedule.js';

const money = value => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(value || 0);

export default function BookingCancellationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/bookings/${id}`)
      .then(res => { if (active && res.data?.success) setBooking(res.data.data); })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Could not load this booking.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const cancellation = useMemo(() => {
    if (!booking) return { allowed: false, reason: '' };
    if (booking.bookingStatus === 'CANCELLED') return { allowed: false, reason: 'This booking has already been cancelled.' };

    const isEvent = booking.bookingType === 'EVENT';
    const scheduledStart = getScheduledStart(
      isEvent ? booking.event?.date : booking.show?.showDate,
      isEvent ? booking.event?.startTime : booking.show?.startTime,
    );
    if (!scheduledStart) return { allowed: true, reason: '' };
    const now = new Date();
    const hoursUntilShow = (scheduledStart.getTime() - now.getTime()) / 3600000;
    const bookingAgeMinutes = (now.getTime() - new Date(booking.createdAt).getTime()) / 60000;
    if (hoursUntilShow <= 0) return { allowed: false, reason: 'This show or event has already started.' };
    if (hoursUntilShow < 6 && bookingAgeMinutes > 30) {
      return { allowed: false, reason: 'Cancellation is available until 6 hours before the start time, or within 30 minutes of making the booking.' };
    }
    return { allowed: true, reason: '' };
  }, [booking]);

  const handleCancel = async () => {
    if (!booking || !cancellation.allowed) return;
    setCancelling(true);
    setError('');
    try {
      const res = await api.post(`/bookings/${booking._id}/cancel`);
      if (res.data?.success) setBooking(res.data.data);
      else setError(res.data?.message || 'The booking could not be cancelled.');
    } catch (err) {
      setError(err.response?.data?.message || 'The booking could not be cancelled. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading cancellation details..." />;
  if (!booking) return (
    <main className="container" style={{ minHeight: '70vh', padding: '64px 20px', color: '#fff', textAlign: 'center' }}>
      <XCircle size={46} color="#ef4444" style={{ margin: '0 auto 14px' }} />
      <h1>Booking not found</h1>
      <p style={{ color: 'var(--text-secondary)', margin: '12px 0 24px' }}>{error || 'This booking may have been removed.'}</p>
      <Link to="/bookings" className="btn-primary">Back to My Bookings</Link>
    </main>
  );

  const title = booking.movie?.title || booking.event?.name || 'Your booking';
  const isCancelled = booking.bookingStatus === 'CANCELLED';
  const hasRefund = booking.paymentStatus === 'REFUND_PENDING' || booking.paymentStatus === 'REFUNDED';

  return (
    <main style={{ background: 'var(--bg-primary)', minHeight: '100vh', padding: '40px 16px 64px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <button type="button" onClick={() => navigate(-1)} className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
          <ArrowLeft size={16} /> Back
        </button>

        <section className="glass-card" style={{ padding: 'clamp(22px, 5vw, 36px)', border: `1px solid ${isCancelled ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.3)'}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
            {isCancelled ? <CheckCircle size={30} color="#22c55e" /> : <AlertCircle size={30} color="#ef4444" />}
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '.75rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 5 }}>Booking #{booking.bookingId}</p>
              <h1 style={{ color: '#fff', fontSize: 'clamp(1.35rem, 4vw, 1.8rem)' }}>{isCancelled ? 'Booking cancelled' : 'Cancel booking'}</h1>
            </div>
          </div>

          <div style={{ padding: 18, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-color)' }}>
            <h2 style={{ color: '#fff', fontSize: '1.08rem', marginBottom: 14 }}>{title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, color: 'var(--text-secondary)', fontSize: '.88rem' }}>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '.72rem', marginBottom: 4 }}>BOOKING STATUS</div>{booking.bookingStatus}</div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '.72rem', marginBottom: 4 }}>PAYMENT STATUS</div>{booking.paymentStatus}</div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '.72rem', marginBottom: 4 }}>TOTAL PAID</div><strong style={{ color: 'var(--accent-gold)' }}>{money(booking.totalAmount)}</strong></div>
            </div>
          </div>

          {isCancelled ? (
            <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: 'rgba(34,197,94,.1)', color: '#bbf7d0', lineHeight: 1.6 }}>
              {hasRefund
                ? `Your cancellation is confirmed. The refund of ${money(booking.totalAmount)} is pending and will be processed within 3-5 business days.`
                : 'Your cancellation is confirmed. No payment refund is due for this booking.'}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20, color: 'var(--text-secondary)', fontSize: '.88rem', lineHeight: 1.6 }}>
                <Clock3 size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                <p>Cancellation is allowed at least 6 hours before the show or event, or within 30 minutes after booking. Paid bookings move to refund pending after cancellation.</p>
              </div>
              {!cancellation.allowed && <p role="alert" style={{ color: '#fca5a5', marginTop: 14 }}>{cancellation.reason}</p>}
            </>
          )}

          {error && !isCancelled && <p role="alert" style={{ color: '#fca5a5', marginTop: 16 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
            {isCancelled ? (
              <Link to="/bookings" className="btn-primary">Return to My Bookings</Link>
            ) : (
              <>
                <button type="button" onClick={handleCancel} disabled={!cancellation.allowed || cancelling} style={{ padding: '11px 18px', borderRadius: 8, border: '1px solid rgba(239,68,68,.5)', background: cancellation.allowed ? '#991b1b' : 'rgba(239,68,68,.12)', color: '#fff', fontWeight: 700, cursor: !cancellation.allowed || cancelling ? 'not-allowed' : 'pointer', opacity: !cancellation.allowed || cancelling ? .65 : 1 }}>
                  {cancelling ? <><LoaderCircle size={15} style={{ verticalAlign: 'middle', marginRight: 7 }} />Cancelling...</> : 'Confirm cancellation'}
                </button>
                <Link to={`/bookings/${booking._id}`} className="btn-outline" style={{ textDecoration: 'none' }}>Keep booking</Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
