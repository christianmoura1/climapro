import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			// Dados são considerados frescos por 1 minuto — trocar de página e
			// voltar não refaz todas as buscas; mutações continuam invalidando
			// as queries afetadas na hora, então nada fica desatualizado.
			staleTime: 60 * 1000,
			retry: 1,
		},
	},
});
