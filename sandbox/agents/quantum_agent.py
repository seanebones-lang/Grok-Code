import sys
from qiskit import QuantumCircuit, execute, Aer
code = sys.argv[1]
qc = QuantumCircuit(2,2)
qc.h(0); qc.cx(0,1); qc.measure([0,1],[0,1])
result = execute(qc, Aer.get_backend('qasm_simulator')).result()
print(f'🌌 Quantum: {code} -> Optimized qubits: {result.get_counts()}')