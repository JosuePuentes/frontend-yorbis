import './App.css'
import AppRouter from './routers/Routers'
import { UserProvider } from "@/context/UserContext";
import Navbar from "@/components/Navbar";

function App() {

  return (
    <UserProvider>
      <div>
        <Navbar />
        <AppRouter />
      </div>
    </UserProvider>
  )
}

export default App