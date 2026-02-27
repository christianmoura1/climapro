import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X, MapPin, Navigation } from "lucide-react";

export default function ClienteForm({ cliente, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(cliente || {
    nome: "",
    email: "",
    telefone: "",
    whatsapp: "",
    endereco: "",
    latitude: null,
    longitude: null,
    tipo_estabelecimento: "comercial",
    observacoes: "",
    tem_acesso_portal: false
  });

  const [capturandoLocalizacao, setCapturandoLocalizacao] = useState(false);
  const [geocodingEndereco, setGeocodingEndereco] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleCapturarLocalizacao = () => {
    if (!navigator.geolocation) {
      alert("❌ Geolocalização não suportada pelo navegador.\n\nUse um navegador moderno (Chrome, Firefox, Safari) para usar esta funcionalidade.");
      return;
    }

    setCapturandoLocalizacao(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setCapturandoLocalizacao(false);
        alert(`✅ Localização capturada com sucesso!\n\nLatitude: ${position.coords.latitude.toFixed(6)}\nLongitude: ${position.coords.longitude.toFixed(6)}\n\nAgora você pode ver o local no mapa.`);
      },
      (error) => {
        console.error("Erro ao capturar localização:", error);
        let mensagemErro = "Erro ao capturar localização.";
        
        if (error.code === 1) {
          mensagemErro = "❌ Permissão de localização negada.\n\nPara usar esta funcionalidade:\n1. Clique no ícone de cadeado/informação na barra de endereço\n2. Permita o acesso à localização\n3. Recarregue a página e tente novamente";
        } else if (error.code === 2) {
          mensagemErro = "❌ Localização indisponível.\n\nVerifique se:\n1. O GPS do dispositivo está ativado\n2. Você está conectado à internet\n3. O navegador tem permissão para acessar a localização";
        } else if (error.code === 3) {
          mensagemErro = "❌ Tempo limite excedido.\n\nTente novamente ou use a busca por endereço.";
        }
        
        alert(mensagemErro);
        setCapturandoLocalizacao(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleGeocodeEndereco = async () => {
    if (!formData.endereco || formData.endereco.trim().length < 10) {
      alert("⚠️ Por favor, preencha um endereço completo.\n\nExemplo correto:\nRua das Flores, 123 - Centro, São Paulo - SP\n\nO endereço deve incluir:\n• Nome da rua e número\n• Bairro\n• Cidade\n• Estado (UF)");
      return;
    }

    setGeocodingEndereco(true);
    try {
      // Limpar e formatar o endereço
      const enderecoLimpo = formData.endereco.trim();
      
      // Tentar com Nominatim (OpenStreetMap)
      const enderecoEncoded = encodeURIComponent(enderecoLimpo + ", Brasil");
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${enderecoEncoded}&limit=3&countrycodes=br`,
        {
          headers: {
            'Accept-Language': 'pt-BR,pt;q=0.9'
          }
        }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        // Pegar o resultado mais relevante
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        setFormData({
          ...formData,
          latitude: lat,
          longitude: lon
        });
        
        alert(`✅ Coordenadas encontradas!\n\nEndereço identificado:\n${result.display_name}\n\nLatitude: ${lat.toFixed(6)}\nLongitude: ${lon.toFixed(6)}\n\n✓ Mapa atualizado abaixo`);
      } else {
        // Dar instruções mais detalhadas
        alert(`❌ Não foi possível encontrar as coordenadas para este endereço.\n\n📝 DICAS PARA MELHORAR A BUSCA:\n\n1. Use o formato completo:\n   Rua [Nome], [Número] - [Bairro], [Cidade] - [UF]\n\n2. Exemplos corretos:\n   • Avenida Paulista, 1578 - Bela Vista, São Paulo - SP\n   • Rua Oscar Freire, 379 - Jardins, São Paulo - SP\n\n3. Se o endereço for muito específico ou novo:\n   • Use o botão "Usar Localização Atual" se estiver no local\n   • Ou busque por um endereço próximo conhecido\n\n4. Evite abreviações demais:\n   ❌ Av. P., 123\n   ✅ Avenida Paulista, 123 - Bela Vista, São Paulo - SP`);
      }
    } catch (error) {
      console.error("Erro ao buscar coordenadas:", error);
      alert("❌ Erro ao conectar com o serviço de mapas.\n\nPor favor:\n1. Verifique sua conexão com a internet\n2. Tente novamente em alguns segundos\n3. Ou use o botão 'Usar Localização Atual'");
    } finally {
      setGeocodingEndereco(false);
    }
  };

  const handleAbrirMapa = () => {
    if (formData.latitude && formData.longitude) {
      window.open(`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`, '_blank');
    }
  };

  return (
    <Card className="mb-8 shadow-lg border-none">
      <CardHeader>
        <CardTitle>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Cliente *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                placeholder="Ex: Shopping Center Plaza"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="contato@cliente.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço Completo</Label>
            <Textarea
              id="endereco"
              value={formData.endereco}
              onChange={(e) => setFormData({...formData, endereco: e.target.value})}
              placeholder="Ex: Avenida Paulista, 1578 - Bela Vista, São Paulo - SP, 01310-200"
              rows={2}
            />
            <p className="text-xs text-gray-500">
              💡 <strong>Formato recomendado:</strong> Rua [Nome], [Número] - [Bairro], [Cidade] - [UF], [CEP]
            </p>
          </div>

          <div className="border rounded-lg p-4 bg-blue-50">
            <Label className="text-sm font-medium mb-3 block">📍 Localização (GPS)</Label>
            
            <div className="grid md:grid-cols-2 gap-4 mb-3">
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude || ""}
                  onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value) || null})}
                  placeholder="Ex: -23.550520"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude || ""}
                  onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value) || null})}
                  placeholder="Ex: -46.633308"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={handleGeocodeEndereco}
                disabled={geocodingEndereco || !formData.endereco}
                className="flex-1"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {geocodingEndereco ? 'Buscando...' : 'Buscar Coordenadas pelo Endereço'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleCapturarLocalizacao}
                disabled={capturandoLocalizacao}
                className="flex-1"
              >
                <Navigation className="w-4 h-4 mr-2" />
                {capturandoLocalizacao ? 'Capturando...' : 'Usar Localização Atual'}
              </Button>
              
              {formData.latitude && formData.longitude && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAbrirMapa}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Ver no Mapa
                </Button>
              )}
            </div>

            {formData.latitude && formData.longitude && (
              <div className="mt-4 border-2 border-blue-300 rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="200"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}&output=embed`}
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_estabelecimento">Tipo de Estabelecimento</Label>
            <select
              id="tipo_estabelecimento"
              value={formData.tipo_estabelecimento}
              onChange={(e) => setFormData({...formData, tipo_estabelecimento: e.target.value})}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="residencial">Residencial</option>
              <option value="comercial">Comercial</option>
              <option value="industrial">Industrial</option>
              <option value="hospitalar">Hospitalar</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Informações adicionais sobre o cliente..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Checkbox
                id="tem_acesso_portal"
                checked={formData.tem_acesso_portal}
                onCheckedChange={(checked) => setFormData({
                  ...formData, 
                  tem_acesso_portal: !!checked
                })}
              />
              <div className="flex-1">
                <label
                  htmlFor="tem_acesso_portal"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  O cliente vai ter acesso ao portal?
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  O cliente poderá fazer login com o email cadastrado acima para acessar chamados e PMOCs.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar Cliente'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}