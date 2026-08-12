import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Globe } from 'lucide-react';

export default function BootDiagnostics({ children }) {
  const [bootStatus, setBootStatus] = useState('loading');
  const [errorInfo, setErrorInfo] = useState(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Marcar início do boot
    console.log('[CLIMAPRO-BOOT] Iniciando aplicação...');
    console.log('[CLIMAPRO-BOOT] User Agent:', navigator.userAgent);
    console.log('[CLIMAPRO-BOOT] Data:', new Date().toISOString());

    // Detectar navegador
    const ua = navigator.userAgent;
    let deviceInfo = 'Desconhecido';
    
    if (/iPhone/.test(ua)) {
      const match = ua.match(/OS (\d+)_(\d+)/);
      if (match) {
        deviceInfo = 'iPhone iOS ' + match[1] + '.' + match[2];
      }
    } else if (/iPad/.test(ua)) {
      deviceInfo = 'iPad';
    } else if (/Android/.test(ua)) {
      const match = ua.match(/Android (\d+\.\d+)/);
      deviceInfo = 'Android ' + (match ? match[1] : '');
    }

    console.log('[CLIMAPRO-BOOT] Dispositivo:', deviceInfo);

    // Verificar cache corrompido
    try {
      const forceReload = localStorage.getItem('climapro_force_reload');
      const lastError = localStorage.getItem('climapro_last_error');
      
      if (lastError) {
        console.warn('[CLIMAPRO-BOOT] Erro anterior detectado:', lastError);
      }

      // Se detectou erro anteriormente e ainda não recarregou
      if (forceReload !== '1' && lastError) {
        console.log('[CLIMAPRO-BOOT] Limpando cache e recarregando...');
        localStorage.setItem('climapro_force_reload', '1');
        
        // Limpar todos os caches possíveis
        if ('caches' in window) {
          caches.keys().then(function(names) {
            names.forEach(function(name) {
              caches.delete(name);
            });
          });
        }
        
        // Recarregar com cache limpo
        setTimeout(function() {
          window.location.reload(true);
        }, 500);
        return;
      }

      // Se já recarregou, remover flag
      if (forceReload === '1') {
        localStorage.removeItem('climapro_force_reload');
        localStorage.removeItem('climapro_last_error');
        console.log('[CLIMAPRO-BOOT] Cache limpo, continuando normalmente...');
      }
    } catch (e) {
      console.error('[CLIMAPRO-BOOT] Erro ao verificar cache:', e);
    }

    // Avisos do navegador que chegam como "erro" mas não quebram nada.
    //
    // "ResizeObserver loop completed with undelivered notifications" é o mais
    // comum: o navegador só está dizendo que adiou medições para o quadro
    // seguinte, o que é normal em lista que muda de tamanho enquanto se digita.
    // A especificação trata isso como aviso, mas o Chrome e o Safari mandam
    // pelo window.onerror — e este handler cobria a tela inteira com "Erro ao
    // Carregar" por causa disso.
    const ERROS_BENIGNOS = [
      'removeChild',
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
    ];

    // Registrar handlers de erro global
    const handleError = function(event) {
      if (event.message && ERROS_BENIGNOS.some((t) => event.message.includes(t))) {
        console.warn('[CLIMAPRO-BOOT] Aviso do navegador ignorado:', event.message);
        event.preventDefault();
        return;
      }

      // Depois que o app subiu, erro solto não pode mais derrubar a tela: quem
      // trata falha de renderização é o ErrorBoundary, que sabe qual pedaço
      // quebrou. Este aqui existe para diagnosticar o carregamento.
      if (window.__climapro_initialized) {
        console.error('[CLIMAPRO-BOOT] Erro após a inicialização (não bloqueia a tela):', event.message);
        return;
      }

      const errorMsg = event.message + ' | ' + event.filename + ':' + event.lineno;
      console.error('[CLIMAPRO-BOOT] Erro global capturado:', errorMsg);
      
      try {
        localStorage.setItem('climapro_last_error', errorMsg);
      } catch (e) {
        // Ignorar erro de localStorage
      }
      
      setErrorInfo({
        message: event.message,
        file: event.filename,
        line: event.lineno,
        type: 'error'
      });
      setBootStatus('error');
      setShowFallback(true);
    };

    const handleUnhandledRejection = function(event) {
      const errorMsg = String(event.reason);

      if (ERROS_BENIGNOS.some((t) => errorMsg.includes(t))) {
        console.warn('[CLIMAPRO-BOOT] Aviso ignorado:', errorMsg);
        return;
      }

      if (window.__climapro_initialized) {
        console.error('[CLIMAPRO-BOOT] Promise rejeitada após a inicialização (não bloqueia a tela):', errorMsg);
        return;
      }

      console.error('[CLIMAPRO-BOOT] Promise rejeitada:', errorMsg);
      
      try {
        localStorage.setItem('climapro_last_error', errorMsg);
      } catch (e) {
        // Ignorar erro de localStorage
      }
      
      setErrorInfo({
        message: errorMsg,
        type: 'promise'
      });
      setBootStatus('error');
      setShowFallback(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Timeout de inicialização (5 segundos)
    const bootTimeout = setTimeout(function() {
      if (!window.__climapro_initialized) {
        console.warn('[CLIMAPRO-BOOT] Timeout: App não inicializou em 5 segundos');
        setBootStatus('timeout');
        setShowFallback(true);
      }
    }, 5000);

    // Marcar como inicializado após 1 segundo
    const initTimer = setTimeout(function() {
      if (!showFallback && bootStatus === 'loading') {
        console.log('[CLIMAPRO-BOOT] Aplicação inicializada com sucesso');
        window.__climapro_initialized = true;
        setBootStatus('ready');
      }
    }, 1000);

    return function() {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      clearTimeout(bootTimeout);
      clearTimeout(initTimer);
    };
  }, []);

  const handleReload = function() {
    console.log('[CLIMAPRO-BOOT] Recarregando aplicação...');
    
    // Limpar todos os dados
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('[CLIMAPRO-BOOT] Erro ao limpar storage:', e);
    }
    
    // Limpar cache e recarregar
    if ('caches' in window) {
      caches.keys().then(function(names) {
        names.forEach(function(name) {
          caches.delete(name);
        });
        window.location.reload(true);
      }).catch(function() {
        window.location.reload(true);
      });
    } else {
      window.location.reload(true);
    }
  };

  const handleClearCache = function() {
    console.log('[CLIMAPRO-BOOT] Limpando cache...');
    
    try {
      localStorage.setItem('climapro_force_reload', '1');
    } catch (e) {
      // Ignorar
    }
    
    handleReload();
  };

  // Mostrar fallback se houver erro
  if (showFallback) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          maxWidth: '500px',
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#FEE2E2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <AlertTriangle style={{ width: '32px', height: '32px', color: '#DC2626' }} />
          </div>
          
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '16px'
          }}>
            {bootStatus === 'timeout' ? 'Carregamento Demorado' : 'Erro ao Carregar'}
          </h2>
          
          <p style={{
            color: '#6B7280',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            {bootStatus === 'timeout' 
              ? 'O aplicativo está demorando mais que o esperado para carregar.'
              : 'Ocorreu um erro ao carregar o sistema ClimaPro.'
            }
          </p>

          {errorInfo && (
            <div style={{
              background: '#FEF3C7',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#92400E',
              wordBreak: 'break-all'
            }}>
              <strong>Detalhes do erro:</strong><br/>
              {errorInfo.message}
              {errorInfo.file && <><br/><strong>Arquivo:</strong> {errorInfo.file}</>}
              {errorInfo.line && <><br/><strong>Linha:</strong> {errorInfo.line}</>}
            </div>
          )}
          
          <div style={{
            background: '#DBEAFE',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <p style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1E40AF',
              marginBottom: '12px'
            }}>
              Tente as seguintes soluções:
            </p>
            <ul style={{
              fontSize: '14px',
              color: '#1E3A8A',
              listStyle: 'decimal',
              paddingLeft: '20px',
              margin: 0
            }}>
              <li style={{ marginBottom: '8px' }}>Recarregar a página</li>
              <li style={{ marginBottom: '8px' }}>Limpar o cache do navegador</li>
              <li style={{ marginBottom: '8px' }}>Tentar em outro navegador</li>
              <li style={{ marginBottom: '8px' }}>Verificar sua conexão com a internet</li>
            </ul>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleReload}
              style={{
                background: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              Recarregar Página
            </button>
            
            <button
              onClick={handleClearCache}
              style={{
                background: '#EF4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Globe style={{ width: '16px', height: '16px' }} />
              Limpar Cache
            </button>
          </div>

          <p style={{
            fontSize: '12px',
            color: '#9CA3AF',
            marginTop: '24px'
          }}>
            Se o problema persistir, entre em contato com o suporte técnico.
          </p>

          <div style={{
            fontSize: '11px',
            color: '#D1D5DB',
            marginTop: '16px',
            padding: '12px',
            background: '#F9FAFB',
            borderRadius: '8px',
            fontFamily: 'monospace'
          }}>
            Device: {navigator.userAgent}
          </div>
        </div>
      </div>
    );
  }

  // Renderizar app normalmente
  return children;
}