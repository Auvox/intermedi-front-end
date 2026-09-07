export const unit = 'Farmácia Central';
const date = days => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); };
export const initialData = {
  employees: [
    { id: 'e1', name: 'Carlos Almeida', email: 'carlos@example.com', role: 'Farmacêutico', shift: 'Manhã' },
    { id: 'e2', name: 'Ana Oliveira', email: 'ana@example.com', role: 'Atendente', shift: 'Tarde' },
    { id: 'e3', name: 'Beatriz Santos', email: 'beatriz@example.com', role: 'Farmacêutica', shift: 'Tarde' },
  ],
  medicines: [
    { id: 'm1', name: 'Paracetamol', dose: '500 mg', quantity: 8, minimum: 20, unit, expiry: '2027-06-30' },
    { id: 'm2', name: 'Dipirona', dose: '500 mg', quantity: 42, minimum: 30, unit, expiry: '2027-08-31' },
    { id: 'm3', name: 'Losartana', dose: '50 mg', quantity: 180, minimum: 40, unit, expiry: '2027-09-30' },
    { id: 'm4', name: 'Amoxicilina', dose: '500 mg', quantity: 96, minimum: 25, unit, expiry: '2027-04-30' },
    { id: 'm5', name: 'Paracetamol', dose: '500 mg', quantity: 120, minimum: 30, unit: 'Farmácia Jardim', expiry: '2027-07-31' },
  ],
  patients: [ { id: 'p1', name: 'Mariana Costa' }, { id: 'p2', name: 'José Ferreira' }, { id: 'p3', name: 'Luciana Ribeiro' } ],
  deliveries: [
    { id: 'd1', patient: 'p1', employee: 'e1', medicine: 'm3', quantity: 30, date: date(2) },
    { id: 'd2', patient: 'p2', employee: 'e2', medicine: 'm1', quantity: 10, date: date(5) },
    { id: 'd3', patient: 'p3', employee: 'e3', medicine: 'm2', quantity: 20, date: date(12) },
    { id: 'd4', patient: 'p1', employee: 'e1', medicine: 'm3', quantity: 30, date: date(35) },
  ],
  tickets: [
    { id: 'c1', employee: 'e1', title: 'Reposição de paracetamol', description: 'Estoque abaixo do mínimo. Solicito reposição para os próximos atendimentos.', unit, status: 'Pendente', priority: 'Alta', date: date(1) },
    { id: 'c2', employee: 'e2', title: 'Dipirona próxima do estoque mínimo', description: 'Verificar a disponibilidade de reposição na rede.', unit, status: 'Em andamento', priority: 'Média', date: date(3) },
    { id: 'c3', employee: 'e3', title: 'Conferência do lote de amoxicilina', description: 'Conferência realizada e estoque regularizado.', unit, status: 'Resolvido', priority: 'Baixa', date: date(8) },
    { id: 'c4', employee: null, author: 'Rafael Lima', title: 'Solicitação de losartana', description: 'A Farmácia Jardim precisa de 30 unidades. Verifique a possibilidade de transferência.', unit: 'Farmácia Jardim', status: 'Pendente', priority: 'Alta', date: date(0) },
  ],
};
export function availability(medicine) {
  if (medicine.quantity <= medicine.minimum) return { label: 'Crítico', tone: 'red' };
  if (medicine.quantity <= medicine.minimum * 2) return { label: 'Quase acabando', tone: 'yellow' };
  return { label: 'Disponível', tone: 'green' };
}
export const formatDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
export function inPeriod(value, days) {
  if (!days) return true;
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - Number(days));
  return new Date(`${value}T12:00:00`) >= start;
}
