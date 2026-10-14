-- Initial PostgreSQL schema for the institutional events platform.
CREATE TYPE "PerfilUsuario" AS ENUM ('PARTICIPANTE', 'ORGANIZADOR', 'ADMIN', 'AVALIADOR');
CREATE TYPE "StatusSolicitacaoOrganizador" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');
CREATE TYPE "ModalidadeEvento" AS ENUM ('PRESENCIAL', 'ONLINE', 'HIBRIDO');
CREATE TYPE "StatusEvento" AS ENUM ('RASCUNHO', 'PUBLICADO', 'CANCELADO', 'ENCERRADO');
CREATE TYPE "StatusInscricao" AS ENUM ('ATIVA', 'CANCELADA', 'CONCLUIDA');
CREATE TYPE "StatusPresenca" AS ENUM ('PRESENTE', 'FALTA', 'JUSTIFICADA');
CREATE TYPE "StatusTrabalhoCientifico" AS ENUM ('SUBMETIDO', 'EM_AVALIACAO', 'APROVADO', 'REJEITADO');

CREATE TABLE "usuarios" (
  "id" UUID NOT NULL,
  "nome" VARCHAR(160) NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "senha_hash" VARCHAR(255) NOT NULL,
  "perfil" "PerfilUsuario" NOT NULL DEFAULT 'PARTICIPANTE',
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "solicitacoes_organizador" (
  "id" UUID NOT NULL,
  "usuario_id" UUID NOT NULL,
  "status" "StatusSolicitacaoOrganizador" NOT NULL DEFAULT 'PENDENTE',
  "decidido_por_id" UUID,
  "decidido_em" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "solicitacoes_organizador_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "eventos" (
  "id" UUID NOT NULL,
  "titulo" VARCHAR(240) NOT NULL,
  "descricao" TEXT NOT NULL,
  "data_inicio" TIMESTAMPTZ(3) NOT NULL,
  "data_termino" TIMESTAMPTZ(3) NOT NULL,
  "local" VARCHAR(300),
  "cidade" VARCHAR(160),
  "url_google_maps" VARCHAR(2048),
  "latitude" DECIMAL(9,6),
  "longitude" DECIMAL(9,6),
  "modalidade" "ModalidadeEvento" NOT NULL,
  "nicho" VARCHAR(120) NOT NULL,
  "vagas_totais" INTEGER NOT NULL,
  "vagas_restantes" INTEGER NOT NULL,
  "status" "StatusEvento" NOT NULL DEFAULT 'RASCUNHO',
  "carga_horaria" DECIMAL(6,2) NOT NULL,
  "banner" VARCHAR(2048),
  "arte_certificado_frente" VARCHAR(2048),
  "arte_certificado_verso" VARCHAR(2048),
  "presenca_finalizada" BOOLEAN NOT NULL DEFAULT false,
  "percentual_minimo_presenca" DECIMAL(5,2) NOT NULL DEFAULT 75.00,
  "aceita_submissao_trabalhos" BOOLEAN NOT NULL DEFAULT false,
  "organizador_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "disciplinas" (
  "id" UUID NOT NULL,
  "evento_id" UUID NOT NULL,
  "nome" VARCHAR(180) NOT NULL,
  "carga_horaria" DECIMAL(6,2) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "disciplinas_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "sessoes" (
  "id" UUID NOT NULL,
  "evento_id" UUID NOT NULL,
  "nome" VARCHAR(180) NOT NULL,
  "inicio" TIMESTAMPTZ(3) NOT NULL,
  "fim" TIMESTAMPTZ(3) NOT NULL,
  "token_qr_hash" VARCHAR(255),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "inscricoes" (
  "id" UUID NOT NULL,
  "participante_id" UUID NOT NULL,
  "evento_id" UUID NOT NULL,
  "token_ingresso_hash" VARCHAR(255) NOT NULL,
  "status" "StatusInscricao" NOT NULL DEFAULT 'ATIVA',
  "data_check_in" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inscricoes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "presencas" (
  "id" UUID NOT NULL,
  "participante_id" UUID NOT NULL,
  "sessao_id" UUID NOT NULL,
  "status" "StatusPresenca" NOT NULL DEFAULT 'FALTA',
  "data_registro" TIMESTAMPTZ(3),
  "alterado_por_id" UUID,
  "data_alteracao" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "presencas_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "trabalhos_cientificos" (
  "id" UUID NOT NULL,
  "titulo" VARCHAR(300) NOT NULL,
  "resumo" TEXT NOT NULL,
  "arquivo_pdf" VARCHAR(2048) NOT NULL,
  "status" "StatusTrabalhoCientifico" NOT NULL DEFAULT 'SUBMETIDO',
  "autor_id" UUID NOT NULL,
  "evento_id" UUID NOT NULL,
  "avaliador_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "trabalhos_cientificos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE INDEX "usuarios_perfil_idx" ON "usuarios"("perfil");
CREATE INDEX "usuarios_ativo_idx" ON "usuarios"("ativo");
CREATE INDEX "solicitacoes_organizador_usuario_id_status_idx" ON "solicitacoes_organizador"("usuario_id", "status");
CREATE INDEX "solicitacoes_organizador_status_created_at_idx" ON "solicitacoes_organizador"("status", "created_at");
CREATE INDEX "solicitacoes_organizador_decidido_por_id_idx" ON "solicitacoes_organizador"("decidido_por_id");
CREATE INDEX "eventos_status_data_inicio_idx" ON "eventos"("status", "data_inicio");
CREATE INDEX "eventos_data_inicio_data_termino_idx" ON "eventos"("data_inicio", "data_termino");
CREATE INDEX "eventos_organizador_id_status_idx" ON "eventos"("organizador_id", "status");
CREATE INDEX "eventos_nicho_idx" ON "eventos"("nicho");
CREATE INDEX "disciplinas_evento_id_idx" ON "disciplinas"("evento_id");
CREATE INDEX "sessoes_evento_id_inicio_idx" ON "sessoes"("evento_id", "inicio");
CREATE UNIQUE INDEX "inscricoes_token_ingresso_hash_key" ON "inscricoes"("token_ingresso_hash");
CREATE UNIQUE INDEX "inscricoes_participante_id_evento_id_key" ON "inscricoes"("participante_id", "evento_id");
CREATE INDEX "inscricoes_participante_id_status_idx" ON "inscricoes"("participante_id", "status");
CREATE INDEX "inscricoes_evento_id_status_idx" ON "inscricoes"("evento_id", "status");
CREATE UNIQUE INDEX "presencas_participante_id_sessao_id_key" ON "presencas"("participante_id", "sessao_id");
CREATE INDEX "presencas_participante_id_status_idx" ON "presencas"("participante_id", "status");
CREATE INDEX "presencas_sessao_id_status_idx" ON "presencas"("sessao_id", "status");
CREATE INDEX "presencas_alterado_por_id_idx" ON "presencas"("alterado_por_id");
CREATE INDEX "trabalhos_cientificos_autor_id_idx" ON "trabalhos_cientificos"("autor_id");
CREATE INDEX "trabalhos_cientificos_evento_id_status_idx" ON "trabalhos_cientificos"("evento_id", "status");
CREATE INDEX "trabalhos_cientificos_avaliador_id_status_idx" ON "trabalhos_cientificos"("avaliador_id", "status");
CREATE INDEX "trabalhos_cientificos_status_created_at_idx" ON "trabalhos_cientificos"("status", "created_at");

ALTER TABLE "solicitacoes_organizador" ADD CONSTRAINT "solicitacoes_organizador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "solicitacoes_organizador" ADD CONSTRAINT "solicitacoes_organizador_decidido_por_id_fkey" FOREIGN KEY ("decidido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_organizador_id_fkey" FOREIGN KEY ("organizador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "disciplinas" ADD CONSTRAINT "disciplinas_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "sessoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_alterado_por_id_fkey" FOREIGN KEY ("alterado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trabalhos_cientificos" ADD CONSTRAINT "trabalhos_cientificos_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trabalhos_cientificos" ADD CONSTRAINT "trabalhos_cientificos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trabalhos_cientificos" ADD CONSTRAINT "trabalhos_cientificos_avaliador_id_fkey" FOREIGN KEY ("avaliador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
