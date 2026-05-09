import { DeviceTable } from "./components/devices";
import "./App.css";

function App() {
  return (
    <main className="w-full min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <h1 className="text-base md:text-lg font-bold text-gray-800">
          IoT Device Management
        </h1>
      </header>
      <DeviceTable />
    </main>
  );
}

export default App;
