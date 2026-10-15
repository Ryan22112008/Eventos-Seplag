import { describe, expect, it } from "vitest";
import { calculateAttendanceSummary, type AttendanceSummaryInput } from "@backend/modules/attendance/attendance-summary";

const base: AttendanceSummaryInput = {
  sessionIds: ["s1", "s2", "s3", "s4"],
  presences: [{ sessaoId: "s1", status: "PRESENTE" }, { sessaoId: "s2", status: "PRESENTE" }, { sessaoId: "s3", status: "PRESENTE" }],
  minimumPercentage: "75.00",
  eventStatus: "ENCERRADO",
  registrationStatus: "ATIVA",
};

describe("cálculo de frequência", () => {
  it("considera 3 de 4 sessões concluídas exatamente no limite mínimo", () => {
    expect(calculateAttendanceSummary(base)).toEqual({
      totalSessoes: 4, sessoesPresentes: 3, sessoesAusentes: 1,
      percentualFrequencia: 75, situacao: "CONCLUIDO", elegivel: true,
    });
  });

  it("não considera elegível abaixo do limite e aceita frequência acima dele", () => {
    expect(calculateAttendanceSummary({ ...base, presences: base.presences.slice(0, 2) }).elegivel).toBe(false);
    expect(calculateAttendanceSummary({ ...base, minimumPercentage: 70 }).elegivel).toBe(true);
  });

  it("define frequência zero quando não há sessões e nunca conclui por divisão indefinida", () => {
    expect(calculateAttendanceSummary({ ...base, sessionIds: [], presences: [], minimumPercentage: 0 })).toMatchObject({
      totalSessoes: 0, sessoesPresentes: 0, sessoesAusentes: 0, percentualFrequencia: 0, elegivel: false,
    });
  });

  it("conta somente presença PRESENTE em sessões do evento e deduplica registros", () => {
    const result = calculateAttendanceSummary({
      ...base,
      sessionIds: ["s1", "s1", "s2"],
      presences: [
        { sessaoId: "s1", status: "PRESENTE" }, { sessaoId: "s1", status: "PRESENTE" },
        { sessaoId: "s2", status: "JUSTIFICADA" }, { sessaoId: "another-event-session", status: "PRESENTE" },
      ],
    });
    expect(result).toMatchObject({ totalSessoes: 2, sessoesPresentes: 1, percentualFrequencia: 50 });
  });

  it("não arredonda o valor exibido para decidir elegibilidade", () => {
    const result = calculateAttendanceSummary({
      ...base, sessionIds: ["s1", "s2", "s3"], presences: [{ sessaoId: "s1", status: "PRESENTE" }], minimumPercentage: "33.34",
    });
    expect(result.percentualFrequencia).toBe(33.33);
    expect(result.elegivel).toBe(false);
  });

  it("usa situação em andamento até encerrar e rejeita cancelados/cancelamento de inscrição", () => {
    expect(calculateAttendanceSummary({ ...base, eventStatus: "PUBLICADO" }).situacao).toBe("EM_ANDAMENTO");
    expect(calculateAttendanceSummary({ ...base, eventStatus: "CANCELADO" })).toMatchObject({ situacao: "NAO_CONCLUIDO", elegivel: false });
    expect(calculateAttendanceSummary({ ...base, registrationStatus: "CANCELADA" })).toMatchObject({ situacao: "NAO_CONCLUIDO", elegivel: false });
  });

  it("rejeita percentual inválido", () => {
    expect(() => calculateAttendanceSummary({ ...base, minimumPercentage: "100.01" })).toThrow(RangeError);
    expect(() => calculateAttendanceSummary({ ...base, minimumPercentage: "-1" })).toThrow(RangeError);
  });
});
