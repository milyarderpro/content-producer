import {
  clearCookie,
  constants,
  cookieValue,
  exactRequest,
  safeHeaders,
  settings,
  unseal,
} from './_shared.js';

const labels = {
  invalid_flow: 'Permintaan uji tidak valid atau kedaluwarsa.',
  denied: 'Izin ditolak. Kode dan token tidak diterbitkan pada alur ini.',
  invalid_token: 'Token tidak memenuhi pemeriksaan owner dan resource.',
  invalid_refresh: 'Token pembaruan tidak memenuhi pemeriksaan.',
  token: 'Pertukaran token gagal.',
  mcp_401_initialize: 'MCP menolak initialize owner dengan HTTP 401.',
  mcp_401_list: 'MCP menolak tools/list owner dengan HTTP 401.',
  mcp_401_profile: 'MCP menolak profil owner dengan HTTP 401.',
  mcp_401_workspace: 'MCP menolak konteks workspace owner dengan HTTP 401.',
  mcp_401_pages: 'MCP menolak daftar Page owner dengan HTTP 401.',
  mcp_http_initialize: 'Initialize MCP gagal.',
  mcp_http_list: 'Daftar tool MCP gagal.',
  mcp_http_profile: 'Pembacaan profil MCP gagal.',
  mcp_http_workspace: 'Pembacaan workspace MCP gagal.',
  mcp_http_pages: 'Pembacaan daftar Page MCP gagal.',
  mcp_size: 'Respons MCP melebihi batas.',
  mcp_format: 'Format respons MCP tidak sesuai.',
  mcp_result: 'Respons MCP berisi kegagalan.',
  tool_count: 'Jumlah atau nama tool tidak sesuai.',
  profile: 'Pembacaan profil owner gagal.',
  workspace: 'Pembacaan workspace owner gagal.',
  pages: 'Pembacaan daftar Page owner gagal.',
  test_error: 'Pengujian belum dapat diselesaikan.',
  owner_read_pass: 'Tiga pembacaan owner berhasil; tepat 33 tool terdaftar.',
  pilot_write_pass: 'Permintaan create_page dikonfirmasi MCP; periksa hasil audit database sebelum menyimpulkan PASS.',
  pilot_disabled: 'Jalur pilot write tidak aktif.',
  pilot_workspace: 'Workspace owner tidak sama dengan workspace yang disetujui.',
  pilot_uncertain: 'Hasil create_page tidak dapat dipastikan. Jangan mencoba ulang; periksa database dan ledger terlebih dahulu.',
  mcp_401_pilot: 'MCP menolak pilot owner dengan HTTP 401.',
  mcp_http_pilot: 'Pemanggilan create_page gagal. Periksa database dan ledger sebelum mengulang.',
};

export async function GET(request) {
  const config = settings();
  if (!config || !exactRequest(request, '/api/phase-9-5/result')) {
    return new Response(null, { status: 404, headers: safeHeaders() });
  }
  const result = await unseal(cookieValue(request, constants.COOKIE_RESULT), config.key);
  const status = result && Object.hasOwn(labels, result.status) ? result.status : 'invalid_flow';
  const detail =
    status === 'owner_read_pass'
      ? `<p>Token HTTP ${Number(result.token_http)}, refresh HTTP ${Number(result.refresh_http)}.</p>`
      : '';
  const body = `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Uji 9.5</title><main><h1>Hasil uji 9.5</h1><p>${labels[status]}</p>${detail}<p><a href="/phase-9-5">Kembali</a></p></main></html>`;
  return new Response(body, {
    status: 200,
    headers: safeHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': clearCookie(constants.COOKIE_RESULT),
    }),
  });
}
