import { DeviceTable } from "./components/devices";
import "./App.css";

function App() {
  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-800">
          IoT Device Management
        </h1>
      </header>
      <DeviceTable />
    </main>
  );
}

export default App;
