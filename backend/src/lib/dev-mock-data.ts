/**
 * Dados centralizados do ambiente de demonstração (DEV_MOCK_MODE).
 *
 * Nenhum dado aqui depende do Prisma / MySQL. Este módulo e seus helpers
 * nunca acessam o banco de dados e nem importam @prisma/client. Destina-se
 * exclusivamente a preencher a interface do participante em modo de
 * demonstração local, com dados fictícios e sem validade real.
 */

export type DevMockRole = "PARTICIPANTE" | "ORGANIZADOR" | "ADMIN" | "AVALIADOR";
export type DevMockRegistrationStatus = "ATIVA" | "CANCELADA" | "CONCLUIDA";
export type DevMockEventStatus = "RASCUNHO" | "PUBLICADO" | "CANCELADO" | "ENCERRADO";
export type DevMockSituation = "EM_ANDAMENTO" | "CONCLUIDO" | "NAO_CONCLUIDO";
export type DevMockWorkStatus = "SUBMETIDO" | "EM_AVALIACAO" | "APROVADO" | "REJEITADO";
export type DevMockPresenceStatus = "PRESENTE" | "FALTA" | "JUSTIFICADA";

export type DevMockSession = {
  id: string;
  nome: string;
  inicio: Date;
  fim: Date;
};

export type DevMockDiscipline = {
  nome: string;
  cargaHoraria: number;
};

export type DevMockEvent = {
  id: string;
  titulo: string;
  descricao: string;
  dataInicio: Date;
  dataTermino: Date;
  local: string;
  cidade: string;
  organizador: string;
  modalidade: "PRESENCIAL" | "ONLINE" | "HIBRIDO";
  nicho: string;
  cargaHoraria: number;
  vagasRestantes: number;
  vagasTotais: number;
  status: DevMockEventStatus;
  banner: string | null;
  disciplinas: DevMockDiscipline[];
  sessoes: DevMockSession[];
  percentualMinimoPresenca: number;
};

export type DevMockRegistration = {
  id: string;
  eventoId: string;
  participanteId: string;
  status: DevMockRegistrationStatus;
  createdAt: Date;
  tokenIngresso: string | null;
};

export type DevMockPresence = {
  id: string;
  sessaoId: string;
  sessaoNome: string;
  sessaoInicio: Date;
  eventoId: string;
  eventoTitulo: string;
  status: DevMockPresenceStatus;
  dataRegistro: Date | null;
};

export type DevMockCertificate = {
  id: string;
  inscricaoId: string;
  eventoId: string;
  participanteId: string;
  situacao: DevMockSituation;
  totalSessoes: number;
  sessoesPresentes: number;
  sessoesAusentes: number;
  percentualFrequencia: number;
  elegivel: boolean;
  certificadoId: string | null;
  codigoValidacao: string | null;
  motivoIndisponibilidade: string | null;
};

export type DevMockScientificWork = {
  id: string;
  titulo: string;
  resumo: string;
  status: DevMockWorkStatus;
  createdAt: Date;
  eventoId: string;
  eventoTitulo: string;
  avaliacao: {
    resultado: "APROVADO" | "REJEITADO";
    parecer: string;
    avaliadoEm: Date;
  } | null;
};

export type DevMockNotification = {
  id: string;
  titulo: string;
  corpo: string;
  lida: boolean;
  criadoEm: Date;
  link: string | null;
};

export type DevMockParticipant = {
  id: string;
  nome: string;
  email: string;
  perfil: DevMockRole;
  ativo: boolean;
  instituicao: string;
  cargo: string;
  cidade: string;
  telefone: string;
  criadoEm: Date;
};

export const DEV_MOCK_PARTICIPANT: DevMockParticipant = {
  id: "dev-participante",
  nome: "Mariana Oliveira Santos",
  email: "mariana.santos@demo.local",
  perfil: "PARTICIPANTE",
  ativo: true,
  instituicao: "SEPLAG-MT",
  cargo: "Analista Administrativa",
  cidade: "Cuiabá - MT",
  telefone: "+55 65 9 9999-0000",
  criadoEm: new Date("2026-01-15T09:00:00"),
};

export const DEV_MOCK_EVENTS: DevMockEvent[] = [
  {
    id: "dev-evento-congresso-2026",
    titulo: "Congresso de Inovação e Gestão Pública 2026",
    descricao:
      "Congresso voltado a boas práticas de inovação, modernização da gestão e transformação digital na administração pública, com palestras, mesas-redondas e apresentação de trabalhos científicos.",
    dataInicio: new Date("2026-08-10T08:00:00"),
    dataTermino: new Date("2026-08-12T18:00:00"),
    local: "Centro de Convenções da SEPLAG",
    cidade: "Cuiabá - MT",
    organizador: "SEPLAG-MT",
    modalidade: "PRESENCIAL",
    nicho: "Gestão Pública",
    cargaHoraria: 24,
    vagasRestantes: 10,
    vagasTotais: 50,
    status: "ENCERRADO",
    banner: null,
    percentualMinimoPresenca: 75,
    disciplinas: [
      { nome: "Inovação Governamental", cargaHoraria: 8 },
      { nome: "Gestão Ágil no Setor Público", cargaHoraria: 8 },
      { nome: "Tecnologia e Serviço ao Cidadão", cargaHoraria: 8 },
    ],
    sessoes: [
      { id: "dev-sessao-congresso-1", nome: "Credenciamento e abertura", inicio: new Date("2026-08-10T08:00:00"), fim: new Date("2026-08-10T09:00:00") },
      { id: "dev-sessao-congresso-2", nome: "Palestra: Inovação na administração pública", inicio: new Date("2026-08-10T09:30:00"), fim: new Date("2026-08-10T11:00:00") },
      { id: "dev-sessao-congresso-3", nome: "Mesa-redonda: Gestão ágil e processos", inicio: new Date("2026-08-10T14:00:00"), fim: new Date("2026-08-10T15:30:00") },
      { id: "dev-sessao-congresso-4", nome: "Oficina: Dados abertos e transparência", inicio: new Date("2026-08-11T08:30:00"), fim: new Date("2026-08-11T11:30:00") },
      { id: "dev-sessao-congresso-5", nome: "Palestra: Inteligência artificial na gestão", inicio: new Date("2026-08-11T14:00:00"), fim: new Date("2026-08-11T15:30:00") },
      { id: "dev-sessao-congresso-6", nome: "Painel: Serviço público centrado no cidadão", inicio: new Date("2026-08-12T08:30:00"), fim: new Date("2026-08-12T10:00:00") },
      { id: "dev-sessao-congresso-7", nome: "Apresentação de trabalhos científicos", inicio: new Date("2026-08-12T10:30:00"), fim: new Date("2026-08-12T12:00:00") },
      { id: "dev-sessao-congresso-8", nome: "Encerramento e entrega de certificados", inicio: new Date("2026-08-12T16:00:00"), fim: new Date("2026-08-12T18:00:00") },
    ],
  },
  {
    id: "dev-evento-workshop-ia",
    titulo: "Workshop de Inteligência Artificial na Administração Pública",
    descricao:
      "Workshop prático sobre uso de inteligência artificial para automação de serviços públicos, atendimento ao cidadão e tomada de decisão baseada em dados.",
    dataInicio: new Date("2026-11-05T08:00:00"),
    dataTermino: new Date("2026-11-06T18:00:00"),
    local: "Auditório SEPLAG - Bloco A",
    cidade: "Cuiabá - MT",
    organizador: "SEPLAG-MT",
    modalidade: "PRESENCIAL",
    nicho: "Tecnologia",
    cargaHoraria: 16,
    vagasRestantes: 5,
    vagasTotais: 40,
    status: "PUBLICADO",
    banner: null,
    percentualMinimoPresenca: 75,
    disciplinas: [
      { nome: "Fundamentos de IA", cargaHoraria: 6 },
      { nome: "IA aplicada ao serviço público", cargaHoraria: 6 },
      { nome: "Ética e governança de dados", cargaHoraria: 4 },
    ],
    sessoes: [
      { id: "dev-sessao-workshop-1", nome: "Abertura", inicio: new Date("2026-11-05T08:00:00"), fim: new Date("2026-11-05T09:00:00") },
      { id: "dev-sessao-workshop-2", nome: "Fundamentos de IA", inicio: new Date("2026-11-05T09:30:00"), fim: new Date("2026-11-05T11:00:00") },
      { id: "dev-sessao-workshop-3", nome: "Casos de uso na administração pública", inicio: new Date("2026-11-05T14:00:00"), fim: new Date("2026-11-05T16:00:00") },
      { id: "dev-sessao-workshop-4", nome: "Laboratório prático e encerramento", inicio: new Date("2026-11-06T09:00:00"), fim: new Date("2026-11-06T12:00:00") },
    ],
  },

  {
    id: "dev-evento-curso-transformacao-digital",
    titulo: "Curso de Transformação Digital no Setor Público",
    descricao:
      "Curso de capacitação sobre digitalização de serviços públicos, prontuário eletrônico do cidadão e modernização de processos internos.",
    dataInicio: new Date("2026-08-20T08:00:00"),
    dataTermino: new Date("2026-08-22T18:00:00"),
    local: "Sala de Capacitação SEPLAG",
    cidade: "Cuiabá - MT",
    organizador: "SEPLAG-MT",
    modalidade: "PRESENCIAL",
    nicho: "Capacitação",
    cargaHoraria: 20,
    vagasRestantes: 0,
    vagasTotais: 30,
    status: "ENCERRADO",
    banner: null,
    percentualMinimoPresenca: 75,
    disciplinas: [
      { nome: "Digitalização de serviços", cargaHoraria: 8 },
      { nome: "Processos digitais e assinatura eletrônica", cargaHoraria: 6 },
      { nome: "Segurança da informação no governo", cargaHoraria: 6 },
    ],
    sessoes: [
      { id: "dev-sessao-curso-1", nome: "Módulo 1: Transformação digital", inicio: new Date("2026-08-20T08:00:00"), fim: new Date("2026-08-20T10:00:00") },
      { id: "dev-sessao-curso-2", nome: "Módulo 2: Serviços ao cidadão", inicio: new Date("2026-08-20T14:00:00"), fim: new Date("2026-08-20T16:00:00") },
      { id: "dev-sessao-curso-3", nome: "Módulo 3: Assinatura eletrônica", inicio: new Date("2026-08-21T08:00:00"), fim: new Date("2026-08-21T10:00:00") },
      { id: "dev-sessao-curso-4", nome: "Módulo 4: Segurança da informação", inicio: new Date("2026-08-21T14:00:00"), fim: new Date("2026-08-21T16:00:00") },
      { id: "dev-sessao-curso-5", nome: "Módulo 5: Projetos práticos", inicio: new Date("2026-08-22T08:00:00"), fim: new Date("2026-08-22T10:00:00") },
      { id: "dev-sessao-curso-6", nome: "Módulo 6: Implantação", inicio: new Date("2026-08-22T10:30:00"), fim: new Date("2026-08-22T12:00:00") },
      { id: "dev-sessao-curso-7", nome: "Módulo 7: Avaliação de impacto", inicio: new Date("2026-08-22T14:00:00"), fim: new Date("2026-08-22T16:00:00") },
      { id: "dev-sessao-curso-8", nome: "Módulo 8: Encerramento", inicio: new Date("2026-08-22T16:30:00"), fim: new Date("2026-08-22T18:00:00") },
    ],
  },
  {
    id: "dev-evento-seminario-gestao",
    titulo: "Seminário de Gestão e Tecnologia",
    descricao:
      "Seminário integrando gestão pública, tecnologia e inovação com foco em liderança e entrega de valor à sociedade.",
    dataInicio: new Date("2026-07-15T08:00:00"),
    dataTermino: new Date("2026-07-16T18:00:00"),
    local: "Centro de Eventos SEPLAG",
    cidade: "Cuiabá - MT",
    organizador: "SEPLAG-MT",
    modalidade: "PRESENCIAL",
    nicho: "Gestão Pública",
    cargaHoraria: 16,
    vagasRestantes: 0,
    vagasTotais: 60,
    status: "ENCERRADO",
    banner: null,
    percentualMinimoPresenca: 75,
    disciplinas: [
      { nome: "Liderança pública", cargaHoraria: 6 },
      { nome: "Tecnologia na gestão", cargaHoraria: 6 },
      { nome: "Entrega de valor ao cidadão", cargaHoraria: 4 },
    ],
    sessoes: [],
  },
];

export const DEV_MOCK_REGISTRATIONS: DevMockRegistration[] = [
  {
    id: "dev-inscricao-congresso",
    eventoId: "dev-evento-congresso-2026",
    participanteId: "dev-participante",
    status: "ATIVA",
    createdAt: new Date("2026-07-20T10:00:00"),
    tokenIngresso: null,
  },
  {
    id: "dev-inscricao-curso",
    eventoId: "dev-evento-curso-transformacao-digital",
    participanteId: "dev-participante",
    status: "ATIVA",
    createdAt: new Date("2026-07-25T11:30:00"),
    tokenIngresso: null,
  },
  {
    id: "dev-inscricao-workshop",
    eventoId: "dev-evento-workshop-ia",
    participanteId: "dev-participante",
    status: "ATIVA",
    createdAt: new Date("2026-10-01T09:15:00"),
    tokenIngresso: null,
  },
  {
    id: "dev-inscricao-seminario",
    eventoId: "dev-evento-seminario-gestao",
    participanteId: "dev-participante",
    status: "CANCELADA",
    createdAt: new Date("2026-06-30T08:45:00"),
    tokenIngresso: null,
  },
];

export const DEV_MOCK_PRESENCES: DevMockPresence[] = [
  { id: "dev-pres-1", sessaoId: "dev-sessao-congresso-1", sessaoNome: "Credenciamento e abertura", sessaoInicio: new Date("2026-08-10T08:00:00"), eventoId: "dev-evento-congresso-2026", eventoTitulo: "Congresso de Inovação e Gestão Pública 2026", status: "PRESENTE", dataRegistro: new Date("2026-08-10T08:10:00") },
  { id: "dev-pres-2", sessaoId: "dev-sessao-congresso-2", sessaoNome: "Palestra: Inovação na administração pública", sessaoInicio: new Date("2026-08-10T09:30:00"), eventoId: "dev-evento-congresso-2026", eventoTitulo: "Congresso de Inovação e Gestão Pública 2026", status: "PRESENTE", dataRegistro: new Date("2026-08-10T09:35:00") },
  { id: "dev-pres-3", sessaoId: "dev-sessao-congresso-3", sessaoNome: "Mesa-redonda: Gestão ágil e processos", sessaoInicio: new Date("2026-08-10T14:00:00"), eventoId: "dev-evento-congresso-2026", eventoTitulo: "Congresso de Inovação e Gestão Pública 2026", status: "PRESENTE", dataRegistro: new Date("2026-08-10T14:05:00") },
  { id: "dev-pres-4", sessaoId: "dev-sessao-congresso-4", sessaoNome: "Oficina: Dados abertos e transparência", sessaoInicio: new Date("2026-08-11T08:30:00"), eventoId: "dev-evento-congresso-2026", eventoTitulo: "Congresso de Inovação e Gestão Pública 2026", status: "PRESENTE", dataRegistro: new Date("2026-08-11T08:40:00") },
  { id: "dev-pres-5", sessaoId: "dev-sessao-congresso-5", sessaoNome: "Palestra: Inteligência artificial na gestão", sessaoInicio: new Date("2026-08-11T14:00:00"), eventoId: "dev-evento-congresso-2026", eventoTitulo: "Congresso de Inovação e Gestão Pública 2026", status: "PRESENTE", dataRegistro: new Date("2026-08-11T14:10:00") },
  { id: "dev-pres-6", sessaoId: "dev-sessao-congresso-6", sessaoNome: "Painel: Serviço público centrado no cidadão", sessaoInicio: new Date("2026-08-12T08:30:00"), eventoId: "dev-evento-congresso-2026", eventoTitulo: "Congresso de Inovação e Gestão Pública 2026", status: "PRESENTE", dataRegistro: new Date("2026-08-12T08:40:00") },
  { id: "dev-pres-7", sessaoId: "dev-sessao-congresso-7", sessaoNome: "Apresentação de trabalhos científicos", sessaoInicio: new Date("2026-08-12T10:30:00"), eventoId: "dev-evento-congresso-2026", eventoTitulo: "Congresso de Inovação e Gestão Pública 2026", status: "PRESENTE", dataRegistro: new Date("2026-08-12T10:40:00") },
  { id: "dev-pres-8", sessaoId: "dev-sessao-congresso-8", sessaoNome: "Encerramento e entrega de certificados", sessaoInicio: new Date("2026-08-12T16:00:00"), eventoId: "dev-evento-congresso-2026", eventoTitulo: "Congresso de Inovação e Gestão Pública 2026", status: "FALTA", dataRegistro: null },
  { id: "dev-pres-9", sessaoId: "dev-sessao-curso-1", sessaoNome: "Módulo 1: Transformação digital", sessaoInicio: new Date("2026-08-20T08:00:00"), eventoId: "dev-evento-curso-transformacao-digital", eventoTitulo: "Curso de Transformação Digital no Setor Público", status: "PRESENTE", dataRegistro: new Date("2026-08-20T08:10:00") },
  { id: "dev-pres-10", sessaoId: "dev-sessao-curso-2", sessaoNome: "Módulo 2: Serviços ao cidadão", sessaoInicio: new Date("2026-08-20T14:00:00"), eventoId: "dev-evento-curso-transformacao-digital", eventoTitulo: "Curso de Transformação Digital no Setor Público", status: "PRESENTE", dataRegistro: new Date("2026-08-20T14:10:00") },
  { id: "dev-pres-11", sessaoId: "dev-sessao-curso-3", sessaoNome: "Módulo 3: Assinatura eletrônica", sessaoInicio: new Date("2026-08-21T08:00:00"), eventoId: "dev-evento-curso-transformacao-digital", eventoTitulo: "Curso de Transformação Digital no Setor Público", status: "FALTA", dataRegistro: null },
  { id: "dev-pres-12", sessaoId: "dev-sessao-curso-4", sessaoNome: "Módulo 4: Segurança da informação", sessaoInicio: new Date("2026-08-21T14:00:00"), eventoId: "dev-evento-curso-transformacao-digital", eventoTitulo: "Curso de Transformação Digital no Setor Público", status: "FALTA", dataRegistro: null },
  { id: "dev-pres-13", sessaoId: "dev-sessao-curso-5", sessaoNome: "Módulo 5: Projetos práticos", sessaoInicio: new Date("2026-08-22T08:00:00"), eventoId: "dev-evento-curso-transformacao-digital", eventoTitulo: "Curso de Transformação Digital no Setor Público", status: "PRESENTE", dataRegistro: new Date("2026-08-22T08:10:00") },
  { id: "dev-pres-14", sessaoId: "dev-sessao-curso-6", sessaoNome: "Módulo 6: Implantação", sessaoInicio: new Date("2026-08-22T10:30:00"), eventoId: "dev-evento-curso-transformacao-digital", eventoTitulo: "Curso de Transformação Digital no Setor Público", status: "PRESENTE", dataRegistro: new Date("2026-08-22T10:40:00") },
  { id: "dev-pres-15", sessaoId: "dev-sessao-curso-7", sessaoNome: "Módulo 7: Avaliação de impacto", sessaoInicio: new Date("2026-08-22T14:00:00"), eventoId: "dev-evento-curso-transformacao-digital", eventoTitulo: "Curso de Transformação Digital no Setor Público", status: "FALTA", dataRegistro: null },
  { id: "dev-pres-16", sessaoId: "dev-sessao-curso-8", sessaoNome: "Módulo 8: Encerramento", sessaoInicio: new Date("2026-08-22T16:30:00"), eventoId: "dev-evento-curso-transformacao-digital", eventoTitulo: "Curso de Transformação Digital no Setor Público", status: "FALTA", dataRegistro: null },
];

export const DEV_MOCK_CERTIFICATES: DevMockCertificate[] = [
  {
    id: "dev-cert-congresso",
    inscricaoId: "dev-inscricao-congresso",
    eventoId: "dev-evento-congresso-2026",
    participanteId: "dev-participante",
    situacao: "CONCLUIDO",
    totalSessoes: 8,
    sessoesPresentes: 7,
    sessoesAusentes: 1,
    percentualFrequencia: 87.5,
    elegivel: true,
    certificadoId: "dev-certificado-pdf-congresso",
    codigoValidacao: "DEMO-2026-CONGRESSO-0001",
    motivoIndisponibilidade: null,
  },
  {
    id: "dev-cert-curso",
    inscricaoId: "dev-inscricao-curso",
    eventoId: "dev-evento-curso-transformacao-digital",
    participanteId: "dev-participante",
    situacao: "CONCLUIDO",
    totalSessoes: 8,
    sessoesPresentes: 4,
    sessoesAusentes: 4,
    percentualFrequencia: 50,
    elegivel: false,
    certificadoId: null,
    codigoValidacao: null,
    motivoIndisponibilidade: "Frequência insuficiente (50,00% abaixo do mínimo de 75,00%).",
  },
  {
    id: "dev-cert-workshop",
    inscricaoId: "dev-inscricao-workshop",
    eventoId: "dev-evento-workshop-ia",
    participanteId: "dev-participante",
    situacao: "EM_ANDAMENTO",
    totalSessoes: 4,
    sessoesPresentes: 0,
    sessoesAusentes: 4,
    percentualFrequencia: 0,
    elegivel: false,
    certificadoId: null,
    codigoValidacao: null,
    motivoIndisponibilidade: "Evento ainda em andamento. O certificado será liberado após a conclusão e consolidação.",
  },
];

export const DEV_MOCK_SCIENTIFIC_WORKS: DevMockScientificWork[] = [
  {
    id: "dev-trabalho-ia-administracao",
    titulo:
      "Aplicações de Inteligência Artificial na Modernização da Administração Pública",
    resumo:
      "Este trabalho apresenta uma revisão das principais aplicações de inteligência artificial na administração pública, abordando automação de atendimento ao cidadão, análise de dados para tomada de decisão, detecção de fraudes e desafios éticos da governança algorítmica no setor público.",
    status: "EM_AVALIACAO",
    createdAt: new Date("2026-09-05T14:20:00"),
    eventoId: "dev-evento-congresso-2026",
    eventoTitulo: "Congresso de Inovação e Gestão Pública 2026",
    avaliacao: null,
  },
];

export const DEV_MOCK_NOTIFICATIONS: DevMockNotification[] = [
  {
    id: "dev-notif-1",
    titulo: "Inscrição confirmada",
    corpo: "Sua inscrição no Congresso de Inovação e Gestão Pública 2026 foi confirmada.",
    lida: false,
    criadoEm: new Date("2026-07-20T10:05:00"),
    link: "/eventos/dev-evento-congresso-2026",
  },
  {
    id: "dev-notif-2",
    titulo: "Você atingiu a frequência mínima",
    corpo: "Parabéns! Você atingiu a frequência mínima no Congresso de Inovação e Gestão Pública 2026 e seu certificado está disponível.",
    lida: false,
    criadoEm: new Date("2026-08-13T09:00:00"),
    link: "/participante/certificados",
  },
  {
    id: "dev-notif-3",
    titulo: "Seu certificado está disponível",
    corpo: "O certificado do Congresso de Inovação e Gestão Pública 2026 já pode ser visualizado e baixado.",
    lida: false,
    criadoEm: new Date("2026-08-13T10:15:00"),
    link: "/participante/certificados",
  },
  {
    id: "dev-notif-4",
    titulo: "Seu trabalho científico está em avaliação",
    corpo: "O trabalho “Aplicações de Inteligência Artificial na Modernização da Administração Pública” está em avaliação pelos pareceristas.",
    lida: false,
    criadoEm: new Date("2026-09-06T08:00:00"),
    link: "/participante/trabalhos",
  },
  {
    id: "dev-notif-5",
    titulo: "Nova informação sobre o evento",
    corpo: "Confira a programação atualizada do Workshop de Inteligência Artificial na Administração Pública.",
    lida: true,
    criadoEm: new Date("2026-10-10T16:30:00"),
    link: "/eventos/dev-evento-workshop-ia",
  },
];

function getEventById(id: string): DevMockEvent | undefined {
  return DEV_MOCK_EVENTS.find((event) => event.id === id);
}

function getRegistrationById(id: string): DevMockRegistration | undefined {
  return DEV_MOCK_REGISTRATIONS.find((registration) => registration.id === id);
}

function getRegistrationsByParticipant(
  participanteId: string,
): DevMockRegistration[] {
  return DEV_MOCK_REGISTRATIONS.filter(
    (registration) => registration.participanteId === participanteId,
  );
}

function getPresencesByParticipant(_participanteId: string): DevMockPresence[] {
  return [...DEV_MOCK_PRESENCES].sort(
    (a, b) => b.sessaoInicio.getTime() - a.sessaoInicio.getTime(),
  );
}

function getScientificWorksByParticipant(
  _participanteId: string,
): DevMockScientificWork[] {
  return [...DEV_MOCK_SCIENTIFIC_WORKS];
}

function getCertificateByEvent(
  eventoId: string,
  participanteId: string,
): DevMockCertificate | undefined {
  return DEV_MOCK_CERTIFICATES.find(
    (cert) =>
      cert.eventoId === eventoId && cert.participanteId === participanteId,
  );
}

function getParticipationSummaries(
  participanteId: string,
): Array<{
  inscricaoId: string;
  inscricaoStatus: DevMockRegistrationStatus;
  event: {
    id: string;
    titulo: string;
    dataInicio: Date;
    dataTermino: Date;
    cargaHoraria: number;
    percentualMinimoPresenca: number;
    status: DevMockEventStatus;
  };
  summary: {
    totalSessoes: number;
    sessoesPresentes: number;
    sessoesAusentes: number;
    percentualFrequencia: number;
    situacao: DevMockSituation;
    elegivel: boolean;
  };
  certificadoId: string | null;
  certificateId: string | null;
  motivoIndisponibilidade: string | null;
}> {
  return getRegistrationsByParticipant(participanteId).map((registration) => {
    const event = getEventById(registration.eventoId)!;
    const certificate = getCertificateByEvent(event.id, participanteId);
    const summary = certificate ?? {
      totalSessoes: event.sessoes.length,
      sessoesPresentes: 0,
      sessoesAusentes: event.sessoes.length,
      percentualFrequencia: 0,
      situacao: "EM_ANDAMENTO" as DevMockSituation,
      elegivel: false,
    };
    return {
      inscricaoId: registration.id,
      inscricaoStatus: registration.status,
      event: {
        id: event.id,
        titulo: event.titulo,
        dataInicio: event.dataInicio,
        dataTermino: event.dataTermino,
        cargaHoraria: event.cargaHoraria,
        percentualMinimoPresenca: event.percentualMinimoPresenca,
        status: event.status,
      },
      summary: {
        totalSessoes: summary.totalSessoes,
        sessoesPresentes: summary.sessoesPresentes,
        sessoesAusentes: summary.sessoesAusentes,
        percentualFrequencia: summary.percentualFrequencia,
        situacao: summary.situacao,
        elegivel: summary.elegivel,
      },
      certificadoId: certificate?.certificadoId ?? null,
      certificateId: certificate?.id ?? null,
      motivoIndisponibilidade: certificate?.motivoIndisponibilidade ?? null,
    };
  });
}

function getScientificWorkById(id: string): DevMockScientificWork | undefined {
  return DEV_MOCK_SCIENTIFIC_WORKS.find((work) => work.id === id);
}

function getNotifications(): DevMockNotification[] {
  return [...DEV_MOCK_NOTIFICATIONS].sort(
    (a, b) => b.criadoEm.getTime() - a.criadoEm.getTime(),
  );
}

function getCertificateById(certificadoId: string): DevMockCertificate | undefined {
  return DEV_MOCK_CERTIFICATES.find((cert) => cert.id === certificadoId);
}

export {
  DEV_MOCK_PARTICIPANT,
  DEV_MOCK_EVENTS,
  DEV_MOCK_REGISTRATIONS,
  DEV_MOCK_PRESENCES,
  DEV_MOCK_CERTIFICATES,
  DEV_MOCK_SCIENTIFIC_WORKS,
  DEV_MOCK_NOTIFICATIONS,
  getEventById,
  getRegistrationById,
  getRegistrationsByParticipant,
  getPresencesByParticipant,
  getCertificateByEvent,
  getCertificateById,
  getParticipationSummaries,
  getScientificWorksByParticipant,
  getScientificWorkById,
  getNotifications,
};
