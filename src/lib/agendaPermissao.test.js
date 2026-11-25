import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizarAgendaPermissao,
  podeEditarAgenda,
  podeVerAgenda,
  ROTULO_AGENDA,
} from './agendaPermissao.js';

test('permissão ausente cai em ver, que é o padrão da coluna', () => {
  assert.equal(normalizarAgendaPermissao(undefined), 'ver');
  assert.equal(normalizarAgendaPermissao(null), 'ver');
  assert.equal(normalizarAgendaPermissao(''), 'ver');
  assert.equal(normalizarAgendaPermissao('completo'), 'ver');
});

test('valores gravados permanecem', () => {
  assert.equal(normalizarAgendaPermissao('nenhum'), 'nenhum');
  assert.equal(normalizarAgendaPermissao('ver'), 'ver');
  assert.equal(normalizarAgendaPermissao('editar'), 'editar');
});

test('ver consulta e editar consulta e grava; nenhum fica de fora', () => {
  assert.equal(podeVerAgenda('ver'), true);
  assert.equal(podeEditarAgenda('ver'), false);

  assert.equal(podeVerAgenda('editar'), true);
  assert.equal(podeEditarAgenda('editar'), true);

  assert.equal(podeVerAgenda('nenhum'), false);
  assert.equal(podeEditarAgenda('nenhum'), false);
});

test('rótulos que a empresa vê na tela de técnicos', () => {
  assert.equal(ROTULO_AGENDA.nenhum, 'Sem acesso');
  assert.equal(ROTULO_AGENDA.ver, 'Ver');
  assert.equal(ROTULO_AGENDA.editar, 'Ver e editar');
});
