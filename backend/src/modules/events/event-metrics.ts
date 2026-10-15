export function calculateEventRates(activeRegistrations: number, totalCapacity: number, participantsPresent: number, nonCancelledParticipants: number) {
  return {
    occupancyRate: totalCapacity > 0 ? activeRegistrations / totalCapacity * 100 : null,
    attendanceRate: nonCancelledParticipants > 0 ? participantsPresent / nonCancelledParticipants * 100 : null,
  };
}
