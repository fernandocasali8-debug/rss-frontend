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
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [preferenceId, setPreferenceId] = useState('');
  const [scriptReady, setScriptReady] = useState(false);
  const brickRef = useRef(null);

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
    if (!preferenceId || !publicKey || !scriptReady || !window.MercadoPago) return undefined;
    if (brickRef.current && brickRef.current.unmount) {
      brickRef.current.unmount();
      brickRef.current = null;
    }
    const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
    const bricksBuilder = mp.bricks();
    bricksBuilder
      .create('wallet', 'mp-wallet-brick', {
        initialization: { preferenceId },
        customization: {
          texts: {
            valueProp: 'smart_option'
          }
        }
      })
      .then((controller) => {
        brickRef.current = controller;
      })
      .catch(() => {
        setError('Falha ao inicializar o checkout.');
      });

    return () => {
      if (brickRef.current && brickRef.current.unmount) {
        brickRef.current.unmount();
        brickRef.current = null;
      }
    };
  }, [preferenceId, publicKey, scriptReady]);

  const handleCheckout = async (plan) => {
    if (!plan) return;
    setCheckoutLoading(true);
    setError('');
    setPreferenceId('');
    try {
      const res = await apiFetch(API_BASE + '/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Falha ao iniciar o pagamento.');
      }
      setPreferenceId(data.preferenceId || '');
    } catch (err) {
      setError(err.message || 'Falha ao iniciar o pagamento.');
    } finally {
      setCheckoutLoading(false);
    }
  };

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
          <button
            type="button"
            className="billing-checkout-button"
            onClick={() => handleCheckout(selectedPlan)}
            disabled={!selectedPlan || checkoutLoading}
          >
            {checkoutLoading ? 'Gerando checkout...' : 'Gerar checkout'}
          </button>
        </div>

        {error && <div className="billing-error">{error}</div>}

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
          <div className="billing-brick" id="mp-wallet-brick" />
        </div>
      </div>
    </div>
  );
}
