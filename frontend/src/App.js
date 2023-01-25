
import { StyledContainer } from "./components/Styles.js";
import Home from "./pages/home/Home.js";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Outlet, RouterProvider, Route
} from "react-router-dom";
import Login from "./pages/login/Login.js";
import Signup from "./pages/signup/Signup.js";


function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<Root />}>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>
    )
  )

  return (
    <div>
      <RouterProvider router={router} />
    </div>

  );

}
const Root = () => {
  return (
    <StyledContainer>
      <Outlet />
    </StyledContainer>

  )
}

export default App;
