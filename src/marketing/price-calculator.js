export function calculatePmocPrice(input) {
  const values = {
    equipment: Math.max(Number(input.equipment) || 0, 1),
    visits: Math.max(Number(input.visits) || 0, 0),
    hours: Math.max(Number(input.hours) || 0, 0),
    people: Math.max(Number(input.people) || 0, 1),
    hourlyCost: Math.max(Number(input.hourlyCost) || 0, 0),
    distance: Math.max(Number(input.distance) || 0, 0),
    kmCost: Math.max(Number(input.kmCost) || 0, 0),
    supplies: Math.max(Number(input.supplies) || 0, 0),
    overhead: Math.min(Math.max(Number(input.overhead) || 0, 0), 100),
    margin: Math.min(Math.max(Number(input.margin) || 0, 0), 90),
  };

  const labor = values.visits * values.hours * values.people * values.hourlyCost;
  const travel = values.visits * values.distance * values.kmCost;
  const supplies = values.visits * values.supplies;
  const directCost = labor + travel + supplies;
  const overhead = directCost * (values.overhead / 100);
  const totalCost = directCost + overhead;
  const suggestedPrice = totalCost / (1 - values.margin / 100);

  return {
    values,
    labor,
    travel,
    supplies,
    directCost,
    overhead,
    totalCost,
    suggestedPrice,
    monthlyReference: suggestedPrice / 12,
    perEquipment: suggestedPrice / values.equipment,
  };
}
