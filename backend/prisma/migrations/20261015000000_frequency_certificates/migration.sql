CREATE TABLE `conclusoes_participantes` (
  `id` CHAR(36) NOT NULL,
  `participante_id` CHAR(36) NOT NULL,
  `evento_id` CHAR(36) NOT NULL,
  `sessoes_totais` INTEGER NOT NULL,
  `sessoes_presentes` INTEGER NOT NULL,
  `percentual_frequencia` DECIMAL(5,2) NOT NULL,
  `situacao` ENUM('EM_ANDAMENTO', 'CONCLUIDO', 'NAO_CONCLUIDO') NOT NULL,
  `consolidado_em` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `conclusoes_participantes_participante_id_evento_id_key` (`participante_id`, `evento_id`),
  INDEX `conclusoes_participantes_evento_id_situacao_idx` (`evento_id`, `situacao`),
  INDEX `conclusoes_participantes_participante_id_situacao_idx` (`participante_id`, `situacao`),
  CONSTRAINT `conclusoes_participantes_participante_id_fkey` FOREIGN KEY (`participante_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `conclusoes_participantes_evento_id_fkey` FOREIGN KEY (`evento_id`) REFERENCES `eventos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `certificados` (
  `id` CHAR(36) NOT NULL,
  `codigo` CHAR(36) NOT NULL,
  `conclusao_id` CHAR(36) NOT NULL,
  `arquivo_pdf` VARCHAR(512) NOT NULL,
  `emitido_em` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `certificados_codigo_key` (`codigo`),
  UNIQUE INDEX `certificados_conclusao_id_key` (`conclusao_id`),
  INDEX `certificados_emitido_em_idx` (`emitido_em`),
  CONSTRAINT `certificados_conclusao_id_fkey` FOREIGN KEY (`conclusao_id`) REFERENCES `conclusoes_participantes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
