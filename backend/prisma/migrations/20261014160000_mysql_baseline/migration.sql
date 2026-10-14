-- Baseline for new MySQL installations.
CREATE TABLE `usuarios` (
  `id` CHAR(36) NOT NULL,
  `nome` VARCHAR(160) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `senha_hash` VARCHAR(255) NOT NULL,
  `perfil` ENUM('PARTICIPANTE', 'ORGANIZADOR', 'ADMIN', 'AVALIADOR') NOT NULL DEFAULT 'PARTICIPANTE',
  `ativo` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `usuarios_email_key` (`email`),
  INDEX `usuarios_perfil_idx` (`perfil`),
  INDEX `usuarios_ativo_idx` (`ativo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `solicitacoes_organizador` (
  `id` CHAR(36) NOT NULL,
  `usuario_id` CHAR(36) NOT NULL,
  `status` ENUM('PENDENTE', 'APROVADO', 'REJEITADO') NOT NULL DEFAULT 'PENDENTE',
  `decidido_por_id` CHAR(36),
  `decidido_em` DATETIME(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `solicitacoes_organizador_usuario_id_status_idx` (`usuario_id`, `status`),
  INDEX `solicitacoes_organizador_status_created_at_idx` (`status`, `created_at`),
  INDEX `solicitacoes_organizador_decidido_por_id_idx` (`decidido_por_id`),
  CONSTRAINT `solicitacoes_organizador_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `solicitacoes_organizador_decidido_por_id_fkey` FOREIGN KEY (`decidido_por_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eventos` (
  `id` CHAR(36) NOT NULL,
  `titulo` VARCHAR(240) NOT NULL,
  `descricao` TEXT NOT NULL,
  `data_inicio` DATETIME(3) NOT NULL,
  `data_termino` DATETIME(3) NOT NULL,
  `local` VARCHAR(300),
  `cidade` VARCHAR(160),
  `url_google_maps` VARCHAR(2048),
  `latitude` DECIMAL(9,6),
  `longitude` DECIMAL(9,6),
  `modalidade` ENUM('PRESENCIAL', 'ONLINE', 'HIBRIDO') NOT NULL,
  `nicho` VARCHAR(120) NOT NULL,
  `vagas_totais` INTEGER NOT NULL,
  `vagas_restantes` INTEGER NOT NULL,
  `status` ENUM('RASCUNHO', 'PUBLICADO', 'CANCELADO', 'ENCERRADO') NOT NULL DEFAULT 'RASCUNHO',
  `carga_horaria` DECIMAL(6,2) NOT NULL,
  `banner` VARCHAR(2048),
  `arte_certificado_frente` VARCHAR(2048),
  `arte_certificado_verso` VARCHAR(2048),
  `presenca_finalizada` BOOLEAN NOT NULL DEFAULT false,
  `percentual_minimo_presenca` DECIMAL(5,2) NOT NULL DEFAULT 75.00,
  `aceita_submissao_trabalhos` BOOLEAN NOT NULL DEFAULT false,
  `organizador_id` CHAR(36) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `eventos_status_data_inicio_idx` (`status`, `data_inicio`),
  INDEX `eventos_data_inicio_data_termino_idx` (`data_inicio`, `data_termino`),
  INDEX `eventos_organizador_id_status_idx` (`organizador_id`, `status`),
  INDEX `eventos_nicho_idx` (`nicho`),
  CONSTRAINT `eventos_organizador_id_fkey` FOREIGN KEY (`organizador_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `disciplinas` (
  `id` CHAR(36) NOT NULL,
  `evento_id` CHAR(36) NOT NULL,
  `nome` VARCHAR(180) NOT NULL,
  `carga_horaria` DECIMAL(6,2) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `disciplinas_evento_id_idx` (`evento_id`),
  CONSTRAINT `disciplinas_evento_id_fkey` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `sessoes` (
  `id` CHAR(36) NOT NULL,
  `evento_id` CHAR(36) NOT NULL,
  `nome` VARCHAR(180) NOT NULL,
  `inicio` DATETIME(3) NOT NULL,
  `fim` DATETIME(3) NOT NULL,
  `token_qr_hash` VARCHAR(255),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `sessoes_evento_id_inicio_idx` (`evento_id`, `inicio`),
  CONSTRAINT `sessoes_evento_id_fkey` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `inscricoes` (
  `id` CHAR(36) NOT NULL,
  `participante_id` CHAR(36) NOT NULL,
  `evento_id` CHAR(36) NOT NULL,
  `token_ingresso_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('ATIVA', 'CANCELADA', 'CONCLUIDA') NOT NULL DEFAULT 'ATIVA',
  `data_check_in` DATETIME(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `inscricoes_token_ingresso_hash_key` (`token_ingresso_hash`),
  UNIQUE INDEX `inscricoes_participante_id_evento_id_key` (`participante_id`, `evento_id`),
  INDEX `inscricoes_participante_id_status_idx` (`participante_id`, `status`),
  INDEX `inscricoes_evento_id_status_idx` (`evento_id`, `status`),
  CONSTRAINT `inscricoes_participante_id_fkey` FOREIGN KEY (`participante_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inscricoes_evento_id_fkey` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `presencas` (
  `id` CHAR(36) NOT NULL,
  `participante_id` CHAR(36) NOT NULL,
  `sessao_id` CHAR(36) NOT NULL,
  `status` ENUM('PRESENTE', 'FALTA', 'JUSTIFICADA') NOT NULL DEFAULT 'FALTA',
  `data_registro` DATETIME(3),
  `alterado_por_id` CHAR(36),
  `data_alteracao` DATETIME(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `presencas_participante_id_sessao_id_key` (`participante_id`, `sessao_id`),
  INDEX `presencas_participante_id_status_idx` (`participante_id`, `status`),
  INDEX `presencas_sessao_id_status_idx` (`sessao_id`, `status`),
  INDEX `presencas_alterado_por_id_idx` (`alterado_por_id`),
  CONSTRAINT `presencas_participante_id_fkey` FOREIGN KEY (`participante_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `presencas_sessao_id_fkey` FOREIGN KEY (`sessao_id`) REFERENCES `sessoes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `presencas_alterado_por_id_fkey` FOREIGN KEY (`alterado_por_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `trabalhos_cientificos` (
  `id` CHAR(36) NOT NULL,
  `titulo` VARCHAR(300) NOT NULL,
  `resumo` TEXT NOT NULL,
  `arquivo_pdf` VARCHAR(2048) NOT NULL,
  `status` ENUM('SUBMETIDO', 'EM_AVALIACAO', 'APROVADO', 'REJEITADO') NOT NULL DEFAULT 'SUBMETIDO',
  `autor_id` CHAR(36) NOT NULL,
  `evento_id` CHAR(36) NOT NULL,
  `avaliador_id` CHAR(36),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `trabalhos_cientificos_autor_id_idx` (`autor_id`),
  INDEX `trabalhos_cientificos_evento_id_status_idx` (`evento_id`, `status`),
  INDEX `trabalhos_cientificos_avaliador_id_status_idx` (`avaliador_id`, `status`),
  INDEX `trabalhos_cientificos_status_created_at_idx` (`status`, `created_at`),
  CONSTRAINT `trabalhos_cientificos_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `trabalhos_cientificos_evento_id_fkey` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `trabalhos_cientificos_avaliador_id_fkey` FOREIGN KEY (`avaliador_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `sessoes_autenticacao` (
  `id` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `usuario_id` CHAR(36) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `sessoes_autenticacao_token_hash_key` (`token_hash`),
  INDEX `sessoes_autenticacao_usuario_id_idx` (`usuario_id`),
  INDEX `sessoes_autenticacao_expires_at_idx` (`expires_at`),
  CONSTRAINT `sessoes_autenticacao_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
