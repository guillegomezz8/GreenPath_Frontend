import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompanySettingsPage from "../CompanySettingsPage";

const mocks = vi.hoisted(() => {
  const snackbar = vi.fn();
  const get = vi.fn();
  const put = vi.fn();
  const apiFactory = vi.fn(() => ({
    get,
    put,
  }));

  return {
    snackbar,
    get,
    put,
    apiFactory,
  };
});

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    api: mocks.apiFactory,
  }),
}));

vi.mock("@/context/SnackbarProvider", () => ({
  useSnackbar: () => mocks.snackbar,
}));

vi.mock("@/components/settings/CompanyHubPicker", () => ({
  default: ({ value, onChange }) => (
    <button type="button" onClick={() => onChange?.({ lat: 37.4, lng: -6.0 })}>
      Mock Hub Picker {value ? "con valor" : "sin valor"}
    </button>
  ),
}));

describe("CompanySettingsPage", () => {
  beforeEach(() => {
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.put.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("guarda el precio con payload independiente", async () => {
    mocks.get.mockResolvedValue({
      data: {
        company_name: "GreenPath Demo",
        default_price_per_liter: "1.200",
        billing_business_name: "Fiscal Demo",
      },
    });
    mocks.put.mockResolvedValue({
      data: {
        settings: {
          company_name: "GreenPath Demo",
          default_price_per_liter: "1.500",
          billing_business_name: "Fiscal Demo",
        },
      },
    });

    const user = userEvent.setup();
    render(<CompanySettingsPage />);

    const priceInput = await screen.findByLabelText(/eur por litro/i);
    await user.clear(priceInput);
    await user.type(priceInput, "1.500");
    await user.click(screen.getByRole("button", { name: /guardar precio/i }));

    await waitFor(() =>
      expect(mocks.put).toHaveBeenCalledWith("companies/settings/", {
        default_price_per_liter: "1.5",
      }),
    );
  });

  it("muestra las secciones como dropdowns", async () => {
    mocks.get.mockResolvedValue({
      data: {
        company_name: "GreenPath Demo",
        default_price_per_liter: "1.200",
      },
    });

    const user = userEvent.setup();
    render(<CompanySettingsPage />);

    expect(await screen.findByText("Precio por litro")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /datos de facturacion/i }));
    expect(screen.getByLabelText(/razon social/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /hub de empresa/i }));
    expect(screen.getByText(/mock hub picker/i)).toBeInTheDocument();
  });

  it("guarda facturacion de forma independiente sin mezclar payload del hub", async () => {
    mocks.get.mockResolvedValue({
      data: {
        company_name: "GreenPath Demo",
        default_price_per_liter: "1.200",
        billing_business_name: "GreenPath Demo S.L.",
        billing_tax_id: "B99999999",
        billing_address: "Poligono Industrial 1",
        billing_postal_code: "41110",
        billing_city: "Bollullos",
        billing_province: "Sevilla",
        billing_country: "España",
        billing_phone: "955000000",
        billing_email: "facturas@greenpath.test",
        billing_bank_account: "ES7620770024003102575766",
        billing_ler_code: "20 01 25",
        billing_footer: "Pie",
        hub: {
          id: 1,
          name: "Nave Principal",
          location: { lat: 37.45, lng: -5.97 },
        },
      },
    });
    mocks.put.mockResolvedValue({
      data: {
        settings: {
          company_name: "GreenPath Demo",
          default_price_per_liter: "1.200",
          billing_business_name: "GreenPath Fiscal S.L.",
          billing_tax_id: "B99999999",
          billing_address: "Poligono Industrial 1",
          billing_postal_code: "41110",
          billing_city: "Bollullos",
          billing_province: "Sevilla",
          billing_country: "España",
          billing_phone: "955000000",
          billing_email: "facturas@greenpath.test",
          billing_bank_account: "ES7620770024003102575766",
          billing_ler_code: "20 01 25",
          billing_footer: "Pie",
          hub: {
            id: 1,
            name: "Nave Principal",
            location: { lat: 37.45, lng: -5.97 },
          },
        },
      },
    });

    const user = userEvent.setup();
    render(<CompanySettingsPage />);

    await screen.findByDisplayValue("GreenPath Demo");
    await user.click(screen.getByRole("button", { name: /datos de facturacion/i }));

    const businessNameInput = await screen.findByLabelText(/razon social/i);
    await user.clear(businessNameInput);
    await user.type(businessNameInput, "GreenPath Fiscal S.L.");

    await user.click(screen.getByRole("button", { name: /guardar facturacion/i }));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));

    const [url, payload] = mocks.put.mock.calls[0];
    expect(url).toBe("companies/settings/");
    expect(payload).toMatchObject({
      default_price_per_liter: "1.200",
      billing_business_name: "GreenPath Fiscal S.L.",
      billing_tax_id: "B99999999",
    });
    expect(payload).not.toHaveProperty("hub_lat");
    expect(payload).not.toHaveProperty("hub_lng");
  });
});
