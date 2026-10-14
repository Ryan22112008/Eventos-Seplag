CREATE TABLE "sessoes_autenticacao" (
  "id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "usuario_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sessoes_autenticacao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessoes_autenticacao_token_hash_key" ON "sessoes_autenticacao"("token_hash");
CREATE INDEX "sessoes_autenticacao_usuario_id_idx" ON "sessoes_autenticacao"("usuario_id");
CREATE INDEX "sessoes_autenticacao_expires_at_idx" ON "sessoes_autenticacao"("expires_at");

ALTER TABLE "sessoes_autenticacao"
  ADD CONSTRAINT "sessoes_autenticacao_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
