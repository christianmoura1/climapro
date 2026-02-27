import React, { useEffect, useState } from 'react';
import { AlertTriangle, Smartphone, Globe } from 'lucide-react';

export default function CompatibilityCheck({ children }) {
  const [isCompatible, setIsCompatible] = useState(true);
  const [browserInfo, setBrowserInfo] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Adicionar polyfills críticos inline
    if (typeof Promise === 'undefined') {
      window.Promise = function(executor) {
        var state = 'pending';
        var value;
        var handlers = [];
        
        function resolve(result) {
          if (state !== 'pending') return;
          state = 'fulfilled';
          value = result;
          handlers.forEach(handle);
          handlers = null;
        }
        
        function reject(error) {
          if (state !== 'pending') return;
          state = 'rejected';
          value = error;
          handlers.forEach(handle);
          handlers = null;
        }
        
        function handle(handler) {
          if (state === 'pending') {
            handlers.push(handler);
          } else {
            if (state === 'fulfilled' && typeof handler.onFulfilled === 'function') {
              handler.onFulfilled(value);
            }
            if (state === 'rejected' && typeof handler.onRejected === 'function') {
              handler.onRejected(value);
            }
          }
        }
        
        this.then = function(onFulfilled, onRejected) {
          return new Promise(function(resolve, reject) {
            handle({
              onFulfilled: function(result) {
                if (onFulfilled) {
                  try {
                    resolve(onFulfilled(result));
                  } catch (ex) {
                    reject(ex);
                  }
                } else {
                  resolve(result);
                }
              },
              onRejected: function(error) {
                if (onRejected) {
                  try {
                    resolve(onRejected(error));
                  } catch (ex) {
                    reject(ex);
                  }
                } else {
                  reject(error);
                }
              }
            });
          });
        };
        
        executor(resolve, reject);
      };
    }

    // Polyfill Object.assign
    if (typeof Object.assign !== 'function') {
      Object.assign = function(target) {
        if (target === null || target === undefined) {
          throw new TypeError('Cannot convert undefined or null to object');
        }
        var to = Object(target);
        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index];
          if (nextSource !== null && nextSource !== undefined) {
            for (var nextKey in nextSource) {
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      };
    }

    // Polyfill Array.includes
    if (!Array.prototype.includes) {
      Array.prototype.includes = function(searchElement) {
        if (this == null) {
          throw new TypeError('Array.prototype.includes called on null or undefined');
        }
        var O = Object(this);
        var len = parseInt(O.length) || 0;
        if (len === 0) {
          return false;
        }
        var n = parseInt(arguments[1]) || 0;
        var k;
        if (n >= 0) {
          k = n;
        } else {
          k = len + n;
          if (k < 0) {k = 0;}
        }
        while (k < len) {
          if (O[k] === searchElement) {
            return true;
          }
          k++;
        }
        return false;
      };
    }

    // Polyfill String.startsWith
    if (!String.prototype.startsWith) {
      String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.substr(position, searchString.length) === searchString;
      };
    }

    // Polyfill String.endsWith
    if (!String.prototype.endsWith) {
      String.prototype.endsWith = function(searchString, position) {
        var subjectString = this.toString();
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
          position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
      };
    }

    // Polyfill Array.find
    if (!Array.prototype.find) {
      Array.prototype.find = function(predicate) {
        if (this == null) {
          throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return value;
          }
        }
        return undefined;
      };
    }

    // Polyfill Array.filter
    if (!Array.prototype.filter) {
      Array.prototype.filter = function(func, thisArg) {
        if (!((typeof func === 'Function' || typeof func === 'function') && this))
          throw new TypeError();
        var len = this.length >>> 0,
            res = new Array(len),
            t = this, c = 0, i = -1;
        if (thisArg === undefined) {
          while (++i !== len) {
            if (i in this) {
              if (func(t[i], i, t)) {
                res[c++] = t[i];
              }
            }
          }
        } else {
          while (++i !== len) {
            if (i in this) {
              if (func.call(thisArg, t[i], i, t)) {
                res[c++] = t[i];
              }
            }
          }
        }
        res.length = c;
        return res;
      };
    }

    // Detectar navegador e versão
    var ua = navigator.userAgent;
    var browser = 'Desconhecido';
    var version = '';
    var compatible = true;
    var shouldWarn = false;

    // Detectar iOS
    if (/iPhone|iPad|iPod/.test(ua)) {
      var match = ua.match(/OS (\d+)_(\d+)/);
      if (match) {
        var iosVersion = parseInt(match[1]);
        browser = 'iOS';
        version = match[1] + '.' + match[2];
        
        // iOS < 12 é incompatível
        if (iosVersion < 12) {
          compatible = false;
        } else if (iosVersion >= 12 && iosVersion < 14) {
          // iOS 12-13 mostra aviso mas permite uso
          shouldWarn = true;
        }
      }
    }
    
    // Detectar Safari
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
      var match = ua.match(/Version\/(\d+)/);
      if (match) {
        var safariVersion = parseInt(match[1]);
        browser = 'Safari';
        version = match[1];
        
        if (safariVersion < 12) {
          compatible = false;
        } else if (safariVersion >= 12 && safariVersion < 14) {
          shouldWarn = true;
        }
      }
    }
    
    // Detectar Chrome
    else if (/Chrome/.test(ua)) {
      var match = ua.match(/Chrome\/(\d+)/);
      if (match) {
        var chromeVersion = parseInt(match[1]);
        browser = 'Chrome';
        version = match[1];
        
        if (chromeVersion < 70) {
          compatible = false;
        } else if (chromeVersion >= 70 && chromeVersion < 90) {
          shouldWarn = true;
        }
      }
    }

    setBrowserInfo(browser + ' ' + version);
    setIsCompatible(compatible);
    setShowWarning(shouldWarn && compatible);

    // Log para monitoramento
    if (!compatible) {
      console.error('Modo compatível BLOQUEADO: navegador muito antigo detectado.', browserInfo);
    } else if (shouldWarn) {
      console.warn('Modo compatível ATIVADO: navegador antigo detectado.', browserInfo);
    } else {
      console.log('Navegador compatível detectado:', browserInfo);
    }

    // Armazenar no localStorage para analytics
    try {
      localStorage.setItem('climapro_browser', browserInfo);
      localStorage.setItem('climapro_compatible', compatible.toString());
    } catch (e) {
      // Ignorar erros de localStorage
    }
  }, []);

  // Bloquear navegadores muito antigos
  if (!isCompatible) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, #FEF3C7 0%, #FCA5A5 100%)',
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
            Navegador Desatualizado
          </h2>
          
          <p style={{
            color: '#6B7280',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            Seu navegador ({browserInfo}) é muito antigo e não consegue executar o ClimaPro corretamente.
          </p>
          
          <div style={{
            background: '#FEF3C7',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <p style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#92400E',
              marginBottom: '12px'
            }}>
              Para usar o ClimaPro, você precisa:
            </p>
            <ul style={{
              fontSize: '14px',
              color: '#78350F',
              listStyle: 'disc',
              paddingLeft: '20px',
              margin: 0
            }}>
              <li>Atualizar seu iPhone para iOS 14 ou superior</li>
              <li>Usar Safari 14+ (iPhone/iPad)</li>
              <li>Usar Google Chrome 90+ (Android/Desktop)</li>
              <li>Acessar de um computador mais recente</li>
            </ul>
          </div>
          
          <div style={{
            padding: '16px',
            background: '#EFF6FF',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <Smartphone style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF', margin: 0 }}>
                Como atualizar seu iPhone:
              </p>
            </div>
            <ol style={{
              fontSize: '13px',
              color: '#1E3A8A',
              textAlign: 'left',
              paddingLeft: '20px',
              margin: 0
            }}>
              <li>Abra Ajustes (Settings)</li>
              <li>Toque em Geral (General)</li>
              <li>Toque em Atualização de Software</li>
              <li>Instale a versão mais recente</li>
            </ol>
          </div>

          <div style={{
            fontSize: '12px',
            color: '#9CA3AF',
            padding: '12px',
            background: '#F9FAFB',
            borderRadius: '8px'
          }}>
            <Globe style={{ width: '16px', height: '16px', display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
            <strong>Navegador detectado:</strong> {browserInfo}
          </div>
        </div>
      </div>
    );
  }

  // Mostrar aviso para navegadores antigos mas funcionais
  if (showWarning) {
    return (
      <div>
        <div style={{
          background: '#FEF3C7',
          borderBottom: '2px solid #F59E0B',
          padding: '12px 20px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            color: '#92400E'
          }}>
            <AlertTriangle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
            <p style={{ margin: 0, flex: 1 }}>
              <strong>Navegador antigo detectado ({browserInfo}).</strong> Algumas funcionalidades podem não funcionar perfeitamente. Recomendamos atualizar para melhor experiência.
            </p>
          </div>
        </div>
        <div style={{ paddingTop: '60px' }}>
          {children}
        </div>
      </div>
    );
  }

  // Navegador compatível - renderizar normalmente
  return children;
}