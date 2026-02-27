
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, Image, Video, Trash2, CheckCircle } from "lucide-react"; // Added CheckCircle
import { base44 } from "@/api/base44Client";

export default function FinalizarChamadoModal({ chamado, onClose, onConfirm, isLoading }) {
  const [formData, setFormData] = useState({
    nome_cliente_confirmacao: "",
    observacoes_finalizacao: "",
    fotos_finalizacao: [],
    videos_finalizacao: []
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions explicitly to avoid scaling issues, especially on mobile
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (formData.fotos_finalizacao.length + files.length > 10) {
      alert('⚠️ Você pode adicionar no máximo 10 fotos');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert(`⚠️ ${file.name} não é uma imagem válida`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert(`⚠️ ${file.name} é muito grande. Tamanho máximo: 10MB`);
        continue;
      }

      setUploadingFile(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        setFormData(prev => ({
          ...prev,
          fotos_finalizacao: [...prev.fotos_finalizacao, result.file_url]
        }));
      } catch (error) {
        console.error('Erro ao fazer upload da foto:', error);
        alert(`❌ Erro ao fazer upload de ${file.name}`);
      } finally {
        setUploadingFile(false);
      }
    }
    
    // Limpar input
    e.target.value = '';
  };

  const handleVideoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (formData.videos_finalizacao.length + files.length > 2) {
      alert('⚠️ Você pode adicionar no máximo 2 vídeos');
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('video/')) {
        alert(`⚠️ ${file.name} não é um vídeo válido`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        alert(`⚠️ ${file.name} é muito grande. Tamanho máximo: 50MB`);
        continue;
      }

      setUploadingFile(true);
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        setFormData(prev => ({
          ...prev,
          videos_finalizacao: [...prev.videos_finalizacao, result.file_url]
        }));
      } catch (error) {
        console.error('Erro ao fazer upload do vídeo:', error);
        alert(`❌ Erro ao fazer upload de ${file.name}`);
      } finally {
        setUploadingFile(false);
      }
    }
    
    // Limpar input
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      fotos_finalizacao: prev.fotos_finalizacao.filter((_, i) => i !== index)
    }));
  };

  const removeVideo = (index) => {
    setFormData(prev => ({
      ...prev,
      videos_finalizacao: prev.videos_finalizacao.filter((_, i) => i !== index)
    }));
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Calculate scale factor for canvas resolution vs CSS size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault(); // Prevent scrolling on touch devices
    setIsDrawing(true);
    setHasSignature(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch devices

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(e);

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirmar = (e) => {
    e.preventDefault(); // Prevent default form submission

    // Validações
    if (!formData.nome_cliente_confirmacao.trim()) {
      alert("⚠️ Por favor, informe o nome da pessoa que acompanhou o atendimento.");
      return;
    }

    if (formData.fotos_finalizacao.length === 0) {
      alert("⚠️ É obrigatório anexar pelo menos 1 foto do serviço finalizado.");
      return;
    }

    if (!hasSignature) { // Check if signature has been drawn
      alert("⚠️ Por favor, colete a assinatura digital.");
      return;
    }

    const canvas = canvasRef.current;
    const assinaturaBase64 = canvas.toDataURL('image/png');
    
    onConfirm({
      ...formData,
      assinatura_cliente: assinaturaBase64,
      status: 'aguardando_aprovacao_empresa' // Novo status: aguarda aprovação da empresa
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Finalizar Chamado</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleConfirmar}> {/* Form wraps content and buttons */}
          <CardContent className="p-6 space-y-6">
            {/* Informação sobre aprovação */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>ℹ️ Processo de Finalização:</strong>
              </p>
              <ol className="text-xs text-blue-700 mt-2 space-y-1 ml-4 list-decimal">
                <li>Você finaliza o chamado com fotos, vídeos e assinatura do cliente</li>
                <li>A <strong>empresa revisa e aprova</strong> o trabalho realizado</li>
                <li>Após aprovação da empresa, o <strong>cliente recebe o relatório completo</strong></li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Importante:</strong> Todos os dados preenchidos serão salvos no histórico do chamado e enviados para a empresa e cliente.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Chamado</Label>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-900">{chamado.titulo}</p>
                <p className="text-sm text-gray-600 mt-1">{chamado.descricao}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome da Pessoa que Acompanhou o Atendimento *</Label>
              <Input
                value={formData.nome_cliente_confirmacao}
                onChange={(e) => setFormData({...formData, nome_cliente_confirmacao: e.target.value})}
                placeholder="Ex: João Silva"
                required
              />
              <p className="text-xs text-gray-500">
                Nome completo da pessoa que recebeu o serviço
              </p>
            </div>

            <div className="space-y-2">
              <Label>Observações do Serviço</Label>
              <Textarea
                value={formData.observacoes_finalizacao}
                onChange={(e) => setFormData({...formData, observacoes_finalizacao: e.target.value})}
                placeholder="Descreva o serviço realizado, peças trocadas, recomendações, etc..."
                rows={4}
              />
            </div>

            {/* Upload de Fotos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Fotos do Serviço (até 10 fotos)
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={uploadingFile || formData.fotos_finalizacao.length >= 10}
                  className="hidden"
                  id="photos-finalizacao"
                />
                <label
                  htmlFor="photos-finalizacao"
                  className={`flex flex-col items-center justify-center cursor-pointer ${formData.fotos_finalizacao.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {uploadingFile ? 'Fazendo upload...' : 
                     formData.fotos_finalizacao.length >= 10 ? 'Limite de 10 fotos atingido' :
                     `Clique para adicionar fotos (${formData.fotos_finalizacao.length}/10)`}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG até 10MB cada</span>
                </label>
              </div>

              {formData.fotos_finalizacao.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                  {formData.fotos_finalizacao.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {index + 1}/10
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload de Vídeos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Vídeos do Serviço (até 2 vídeos)
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleVideoUpload}
                  disabled={uploadingFile || formData.videos_finalizacao.length >= 2}
                  className="hidden"
                  id="videos-finalizacao"
                />
                <label
                  htmlFor="videos-finalizacao"
                  className={`flex flex-col items-center justify-center cursor-pointer ${formData.videos_finalizacao.length >= 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {uploadingFile ? 'Fazendo upload...' : 
                     formData.videos_finalizacao.length >= 2 ? 'Limite de 2 vídeos atingido' :
                     `Clique para adicionar vídeos (${formData.videos_finalizacao.length}/2)`}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">MP4, MOV até 50MB cada</span>
                </label>
              </div>

              {formData.videos_finalizacao.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {formData.videos_finalizacao.map((url, index) => (
                    <div key={index} className="relative group">
                      <video
                        src={url}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                        controls
                      />
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Vídeo {index + 1}/2
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Assinatura do Cliente *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                >
                  Limpar
                </Button>
              </div>
              <div className="border-2 border-gray-300 rounded-lg bg-white relative h-48"> {/* Added relative and h-48 */}
                <canvas
                  ref={canvasRef}
                  className="w-full h-full touch-none" // Made canvas fill parent
                  style={{ touchAction: 'none' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-gray-500">
                ✍️ Peça para o cliente assinar com o dedo (mobile) ou mouse (desktop)
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t"> {/* Buttons moved inside CardContent */}
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading || uploadingFile}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit" // Changed to type="submit" to trigger form submission
                disabled={isLoading || uploadingFile}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Enviar para Aprovação da Empresa
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
