# Backup Express’Arte de 14/11/2026

O arquivo `expressarte-2026-11-14.zip.aes` está criptografado com AES-256-GCM. A chave de recuperação foi guardada separadamente.

O ZIP contém o histórico completo das seis branches do GitHub no momento da cópia, a compilação do catálogo e do importador a partir do commit publicado `af7794c771f81e02b427c50dcb63099c788ec007`, o banco D1 com suas oito tabelas, os dois objetos do R2 com seus metadados e as configurações coletadas do Pages e dos bindings do Worker. As fotos estáticas também estão no histórico do Git.

SHA-256 do arquivo criptografado

```
acc57ceecf506cac6f20645ffdfebe915de30394e423ccabf646e58346bc41a7
```

## Abrir e restaurar

1. Baixe o arquivo criptografado e `restaurar.cjs`. Com o Node.js e a chave de recuperação, execute:

   ```powershell
   node restaurar.cjs expressarte-2026-11-14.zip.aes chave-backup-expressarte-2026-11-14.hex expressarte-restaurado.zip
   ```

2. Extraia o ZIP. Para restaurar o código e as referências das seis branches:

   ```powershell
   git clone --mirror github-history.bundle expressarte-restaurado.git
   ```

3. Para recuperar o serviço, importe `database.sql` em um banco D1 novo. Copie os arquivos de `r2/` para um bucket R2, preservando os caminhos e os metadados de `cloudflare.json`. Configure os bindings e a publicação do Worker com o `wrangler.toml` do repositório. O diretório `pages/` contém a compilação estática.
4. Reconfigure os valores secretos pelo Cloudflare. Se os endereços públicos mudarem, atualize o catálogo e as referências de imagem para apontarem para os recursos restaurados.

A publicação e a restauração em uma nova conta do Cloudflare dependem das permissões dessa conta. O valor de `ADMIN_TOKEN` não faz parte do pacote.
