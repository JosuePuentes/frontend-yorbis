import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from "react-router";
import App from './App.tsx'
import { DataFarmaciaProvider } from './context/DataFarmaciaContext.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
      <DataFarmaciaProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DataFarmaciaProvider>
    </QueryClientProvider>
)
