import React, { useEffect, useRef, useState } from 'react';
import { API_BASE, apiFetch } from './api';
import './BillingPage.css';
import fallbackFavicon from './fallback-favicon.svg';

const formatPrice = (value, currency) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: currency || 'BRL'
}).format(value || 0);

export default function BillingPage() {
  const [plans, setPlans] = useState([]);
  const [currency, setCurrency] = useState('BRL');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentDetail, setPaymentDetail] = useState(null);
  const [scriptReady, setScriptReady] = useState(false);
  const brickRef = useRef(null);
  const brickContainerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiFetch(API_BASE + '/billing/config').then(res => res.json()),
      apiFetch(API_BASE + '/billing/plans').then(res => res.json())
    ])
      .then(([config, planPayload]) => {
        if (!mounted) return;
        setPublicKey(config?.publicKey || '');
        setCurrency(planPayload?.currency || 'BRL');
        const list = Array.isArray(planPayload?.plans) ? planPayload.plans : [];
        setPlans(list);
        setSelectedPlan(list.find((item) => item.highlight) || list[0] || null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Nao foi possivel carregar os planos.');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (window.MercadoPago) {
      setScriptReady(true);
      return undefined;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError('Falha ao carregar o checkout.');
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!selectedPlan || !publicKey || !scriptReady || !window.MercadoPago) return undefined;
    let isMounted = true;

    const mountBrick = async () => {
      if (brickRef.current && brickRef.current.unmount) {
        await brickRef.current.unmount();
        brickRef.current = null;
      }
      if (brickContainerRef.current) {
        brickContainerRef.current.innerHTML = '';
      }
      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();

      try {
        const controller = await bricksBuilder.create('payment', 'mp-payment-brick', {
          initialization: {
            amount: selectedPlan.price
          },
          customization: {
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
              bankTransfer: 'all',
              ticket: 'all'
            },
            visual: {
              style: {
                theme: 'default',
                customVariables: {
                  formBackgroundColor: '#ffffff',
                  baseColor: '#0f172a',
                  baseColorSecondVariant: '#22c55e',
                  textPrimaryColor: '#0f172a',
                  textSecondaryColor: '#64748b',
                  inputBackgroundColor: '#f8fafc',
                  inputBorderColor: '#e2e8f0',
                  inputPlaceholderColor: '#94a3b8',
                  buttonBackgroundColor: '#0f172a',
                  buttonTextColor: '#ffffff',
                  borderRadius: '12px'
                }
              }
            }
          },
          callbacks: {
            onReady: () => {},
            onSubmit: ({ selectedPaymentMethod, formData }) => (
              new Promise(async (resolve, reject) => {
                setPaymentStatus('processing');
                setPaymentMessage('');
                setPaymentDetail(null);
                try {
                  const res = await apiFetch(API_BASE + '/billing/payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      planId: selectedPlan.id,
                      token: formData?.token,
                      payment_method_id: selectedPaymentMethod?.id || formData?.payment_method_id,
                      installments: formData?.installments,
                      payer: formData?.payer
                    })
                  });
                  const data = await res.json();
                  if (!res.ok || !data.ok) {
                    const detailMessage = data?.detail?.message || data?.detail?.error || '';
                    throw new Error(detailMessage || data.message || 'Falha ao processar pagamento.');
                  }
                  setPaymentStatus(data.status || 'approved');
                  setPaymentDetail(data.detail || null);
                  if (data.status === 'pending') {
                    setPaymentMessage('Pagamento pendente. Use o QR Code para concluir.');
                  } else {
                    setPaymentMessage('Pagamento processado. Acompanhe o status no seu painel.');
                  }
                  resolve();
                } catch (err) {
                  setPaymentStatus('error');
                  setPaymentMessage(err.message || 'Falha ao processar pagamento.');
                  reject();
                }
              })
            ),
            onError: () => {
              setPaymentStatus('error');
              setPaymentMessage('Falha ao carregar o checkout.');
            }
          }
        });

        if (isMounted) {
          brickRef.current = controller;
        }
      } catch (err) {
        if (isMounted) {
          setError('Falha ao inicializar o checkout.');
        }
      }
    };

    mountBrick();

    return () => {
      isMounted = false;
      if (brickRef.current && brickRef.current.unmount) {
        brickRef.current.unmount();
        brickRef.current = null;
      }
    };
  }, [selectedPlan, publicKey, scriptReady]);

  const handleFaviconError = (event) => {
    if (!event?.currentTarget) return;
    event.currentTarget.src = fallbackFavicon;
  };

  if (loading) {
    return <div className="billing-loading">Carregando planos...</div>;
  }

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <h2>Planos e pagamentos</h2>
          <p>Escolha o plano ideal para seu momento. Pagamento em ambiente de teste.</p>
        </div>
      </div>

      <div className="billing-grid">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className={`billing-card ${selectedPlan?.id === plan.id ? 'active' : ''} ${plan.highlight ? 'highlight' : ''}`}
            onClick={() => setSelectedPlan(plan)}
          >
            <div className="billing-card-head">
              <div className="billing-card-title">{plan.name}</div>
              <div className="billing-card-price">{formatPrice(plan.price, currency)}</div>
            </div>
            <div className="billing-card-desc">{plan.description}</div>
            <div className="billing-card-features">
              {(plan.features || []).map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="billing-checkout">
        <div className="billing-checkout-header">
          <div>
            <h3>{selectedPlan ? `Assinar ${selectedPlan.name}` : 'Selecione um plano'}</h3>
            <p>Checkout embutido via Mercado Pago (modo teste).</p>
          </div>
          <div className="billing-checkout-pill">Personalizavel</div>
        </div>

        {error && <div className="billing-error">{error}</div>}
        {paymentMessage && (
          <div className={`billing-status ${paymentStatus}`}>{paymentMessage}</div>
        )}
        {paymentDetail?.point_of_interaction?.transaction_data?.qr_code_base64 && (
          <div className="billing-qr">
            <div className="billing-qr-title">QR Code Pix</div>
            <img
              className="billing-qr-image"
              src={`data:image/png;base64,${paymentDetail.point_of_interaction.transaction_data.qr_code_base64}`}
              alt="QR Code Pix"
            />
            {paymentDetail.point_of_interaction.transaction_data.qr_code && (
              <div className="billing-qr-code">
                {paymentDetail.point_of_interaction.transaction_data.qr_code}
              </div>
            )}
          </div>
        )}

        <div className="billing-live">
          <div className="billing-live-card">
            <div className="billing-live-title">Ultima noticia em destaque</div>
            <div className="billing-live-body">
              <img
                className="billing-live-favicon"
                src="https://www.google.com/s2/favicons?domain=mercadopago.com&sz=64"
                alt=""
                onError={handleFaviconError}
              />
              <div>
                <div className="billing-live-head">Checkout seguro e rapido</div>
                <div className="billing-live-meta">Mercado Pago</div>
              </div>
            </div>
          </div>
          <div className="billing-brick" id="mp-payment-brick" ref={brickContainerRef} />
        </div>
      </div>
    </div>
  );
}
