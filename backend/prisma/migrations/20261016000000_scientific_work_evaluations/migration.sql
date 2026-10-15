ALTER TABLE `eventos`
  ADD COLUMN `inicio_submissao_trabalhos` DATETIME(3) NULL,
  ADD COLUMN `fim_submissao_trabalhos` DATETIME(3) NULL;

CREATE TABLE `avaliacoes_trabalhos` (
  `id` CHAR(36) NOT NULL,
  `trabalho_id` CHAR(36) NOT NULL,
  `avaliador_id` CHAR(36) NOT NULL,
  `resultado` ENUM('APROVADO', 'REJEITADO') NOT NULL,
  `parecer` TEXT NOT NULL,
  `avaliado_em` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `avaliacoes_trabalhos_trabalho_id_key` (`trabalho_id`),
  INDEX `avaliacoes_trabalhos_avaliador_id_avaliado_em_idx` (`avaliador_id`, `avaliado_em`),
  CONSTRAINT `avaliacoes_trabalhos_trabalho_id_fkey` FOREIGN KEY (`trabalho_id`) REFERENCES `trabalhos_cientificos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `avaliacoes_trabalhos_avaliador_id_fkey` FOREIGN KEY (`avaliador_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
