import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      autoRetryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    console.error('[CLIMAPRO-ERROR-BOUNDARY] Erro capturado:', error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CLIMAPRO-ERROR-BOUNDARY] Detalhes do erro:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Auto-recovery: tentar recuperar automaticamente após 2 segundos
    if (this.state.autoRetryCount < 3) {
      setTimeout(() => {
        console.log('[CLIMAPRO-ERROR-BOUNDARY] Tentando recuperação automática...');
        this.setState({ 
          hasError: false, 
          error: null, 
          errorInfo: null,
          autoRetryCount: this.state.autoRetryCount + 1
        });
      }, 2000);
    }
  }

  handleManualReload = () => {
    console.log('[CLIMAPRO-ERROR-BOUNDARY] Recarregamento manual solicitado');
    window.location.reload();
  };

  handleReset = () => {
    console.log('[CLIMAPRO-ERROR-BOUNDARY] Reset manual do boundary');
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      autoRetryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FCA5A5 100%)'
        }}>
          <div style={{
            maxWidth: '500px',
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#FEF3C7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <AlertTriangle style={{ width: '32px', height: '32px', color: '#F59E0B' }} />
            </div>
            
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '16px'
            }}>
              Erro ao Carregar Componente
            </h2>
            
            <p style={{
              color: '#6B7280',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              {this.state.autoRetryCount < 3 
                ? 'Tentando recuperar automaticamente...'
                : 'Não foi possível recuperar automaticamente. Tente recarregar a página.'
              }
            </p>

            {this.state.autoRetryCount >= 3 && (
              <div style={{
                background: '#FEF3C7',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#92400E',
                maxHeight: '150px',
                overflow: 'auto'
              }}>
                <strong>Detalhes técnicos:</strong><br/>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    <br/><br/>
                    <strong>Stack:</strong><br/>
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReset}
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
                Tentar Novamente
              </button>
              
              <button
                onClick={this.handleManualReload}
                style={{
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Recarregar Página
              </button>
            </div>

            {this.state.autoRetryCount > 0 && this.state.autoRetryCount < 3 && (
              <p style={{
                fontSize: '12px',
                color: '#9CA3AF',
                marginTop: '16px'
              }}>
                Tentativa {this.state.autoRetryCount} de 3...
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;