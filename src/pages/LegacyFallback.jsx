import React from "react";
import { Smartphone, Globe, ArrowRight } from "lucide-react";

export default function LegacyFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, #EBF4FF 0%, #DBEAFE 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <Globe style={{ width: '40px', height: '40px', color: 'white' }} />
        </div>
        
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '16px'
        }}>
          ClimaPro - Modo Compatível
        </h1>
        
        <p style={{
          color: '#6B7280',
          fontSize: '16px',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          Detectamos que seu navegador é antigo. Carregando versão otimizada do ClimaPro...
        </p>

        <div style={{
          background: '#EFF6FF',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <p style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1E40AF',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Smartphone style={{ width: '18px', height: '18px' }} />
            Para melhor experiência:
          </p>
          <ul style={{
            fontSize: '14px',
            color: '#1E3A8A',
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            <li style={{ marginBottom: '8px', paddingLeft: '24px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>✓</span>
              Atualize para iOS 14+ ou Safari 14+
            </li>
            <li style={{ marginBottom: '8px', paddingLeft: '24px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>✓</span>
              Use Chrome 90+ no Android
            </li>
            <li style={{ marginBottom: '8px', paddingLeft: '24px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>✓</span>
              Acesse de um computador desktop
            </li>
          </ul>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Tentar Acessar
            <ArrowRight style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        <p style={{
          fontSize: '12px',
          color: '#9CA3AF',
          marginTop: '24px'
        }}>
          Se o problema persistir, entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}