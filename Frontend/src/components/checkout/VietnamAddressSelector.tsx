import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { vietnamAddresses, type VietnamDistrict, type VietnamProvince } from "@/data/vietnamAddresses";
import { Input } from "@/components/ui/input";

export interface AddressSelection {
  province: string;
  district: string;
  ward: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
}

interface VietnamAddressSelectorProps {
  value: AddressSelection;
  onChange: (value: AddressSelection) => void;
  error?: string;
  id?: string;
  label?: string;
}

type AddressStep = "province" | "district" | "ward";

const STEP_LABELS: Record<AddressStep, string> = {
  province: "Tỉnh/Thành phố",
  district: "Quận/Huyện",
  ward: "Phường/Xã",
};

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const filterBySearch = <T extends { name: string }>(items: readonly T[], search: string) => {
  const normalizedSearch = normalizeSearchText(search.trim());
  if (!normalizedSearch) return items;
  return items.filter((item) => normalizeSearchText(item.name).includes(normalizedSearch));
};

const VietnamAddressSelector = ({
  value,
  onChange,
  error,
  id: providedId,
  label = "Khu vực giao hàng",
}: VietnamAddressSelectorProps) => {
  const generatedId = useId().replace(/:/g, "");
  const id = providedId ?? `address-selector-${generatedId}`;
  const errorId = error ? `${id}-error` : undefined;
  const pickerId = `${id}-picker`;
  const searchId = `${id}-search`;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<AddressStep>("province");
  const [search, setSearch] = useState("");

  const selectedProvince = useMemo(
    () => vietnamAddresses.find((province) => province.code === value.provinceCode || province.name === value.province),
    [value.province, value.provinceCode],
  );
  const selectedDistrict = useMemo(
    () => selectedProvince?.districts.find((district) => district.code === value.districtCode || district.name === value.district),
    [selectedProvince, value.district, value.districtCode],
  );
  const selectedWard = useMemo(
    () => selectedDistrict?.wards.find((ward) => ward.code === value.wardCode || ward.name === value.ward),
    [selectedDistrict, value.ward, value.wardCode],
  );
  const visibleItems = useMemo(() => {
    if (activeStep === "province") return filterBySearch(vietnamAddresses, search);
    if (activeStep === "district") return filterBySearch(selectedProvince?.districts ?? [], search);
    return filterBySearch(selectedDistrict?.wards ?? [], search);
  }, [activeStep, search, selectedDistrict, selectedProvince]);
  const summary = [value.ward, value.district, value.province].filter(Boolean).join(", ");

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        setSearch("");
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openPicker = () => {
    setIsOpen(true);
    setSearch("");
    if (!value.province) setActiveStep("province");
    else if (!value.district) setActiveStep("district");
    else if (!value.ward) setActiveStep("ward");
  };

  const selectProvince = (province: VietnamProvince) => {
    onChange({
      province: province.name,
      provinceCode: province.code,
      district: "",
      ward: "",
      districtCode: undefined,
      wardCode: undefined,
    });
    setActiveStep("district");
    setSearch("");
  };

  const selectDistrict = (district: VietnamDistrict) => {
    onChange({
      ...value,
      district: district.name,
      districtCode: district.code,
      ward: "",
      wardCode: undefined,
    });
    setActiveStep("ward");
    setSearch("");
  };

  const selectWard = (ward: VietnamDistrict["wards"][number]) => {
    onChange({ ...value, ward: ward.name, wardCode: ward.code });
    setIsOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  };

  const clearSelection = () => {
    onChange({
      province: "",
      district: "",
      ward: "",
      provinceCode: undefined,
      districtCode: undefined,
      wardCode: undefined,
    });
    setActiveStep("province");
    setSearch("");
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelect = (item: (typeof visibleItems)[number]) => {
    if (activeStep === "province") selectProvince(item as VietnamProvince);
    else if (activeStep === "district") selectDistrict(item as VietnamDistrict);
    else selectWard(item as VietnamDistrict["wards"][number]);
  };

  const canOpenStep = (step: AddressStep) => {
    if (step === "province") return true;
    if (step === "district") return Boolean(selectedProvince);
    return Boolean(selectedDistrict);
  };

  return (
    <div ref={wrapperRef} className="relative sm:col-span-2">
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-text-strong">
        {label} <span aria-hidden="true" className="text-destructive">*</span>
      </label>
      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          onClick={openPicker}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? pickerId : undefined}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          className={`flex min-h-11 w-full items-center gap-3 rounded-md border bg-surface px-3 py-2 text-left text-sm shadow-elevation-1 outline-none transition-[border-color,box-shadow] focus-visible:border-focus focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${error ? "border-destructive" : "border-border-strong"}`}
        >
          <MapPin aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className={`min-w-0 flex-1 truncate ${summary ? "text-text-strong" : "text-muted-foreground"}`}>
            {summary || "Chọn tỉnh/thành, quận/huyện và phường/xã"}
          </span>
          <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {summary && (
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Xóa khu vực giao hàng đã chọn"
            className="absolute right-9 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-surface-subtle hover:text-text-strong focus-visible:ring-[3px] focus-visible:ring-focus/45"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      {error && <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">{error}</p>}

      {isOpen && (
        <div
          id={pickerId}
          role="dialog"
          aria-label="Chọn khu vực giao hàng"
          className="absolute z-dropdown mt-2 w-full min-w-[18rem] overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-elevation-2"
        >
          <div role="tablist" aria-label="Cấp địa chỉ" className="grid grid-cols-3 border-b border-divider bg-surface-subtle">
            {(Object.keys(STEP_LABELS) as AddressStep[]).map((step) => (
              <button
                key={step}
                type="button"
                role="tab"
                aria-selected={activeStep === step}
                disabled={!canOpenStep(step)}
                onClick={() => {
                  setActiveStep(step);
                  setSearch("");
                }}
                className={`min-h-11 border-b-2 px-2 py-3 text-xs font-semibold outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 ${activeStep === step ? "border-primary bg-surface-elevated text-primary" : "border-transparent text-muted-foreground hover:text-text-strong"}`}
              >
                {STEP_LABELS[step]}
              </button>
            ))}
          </div>

          <div className="border-b border-divider p-3">
            <label htmlFor={searchId} className="sr-only">Tìm {STEP_LABELS[activeStep].toLowerCase()}</label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={searchId}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Tìm ${STEP_LABELS[activeStep].toLowerCase()}…`}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          <div role="listbox" aria-label={STEP_LABELS[activeStep]} className="max-h-[min(20rem,55vh)] overflow-y-auto p-2">
            {visibleItems.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">Không tìm thấy địa chỉ phù hợp.</p>
            ) : (
              visibleItems.map((item) => {
                const isSelected = (
                  item.code === selectedProvince?.code
                  || item.code === selectedDistrict?.code
                  || item.code === selectedWard?.code
                );

                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-focus/45 ${isSelected ? "bg-primary-subtle text-primary-subtle-foreground" : "text-text-strong hover:bg-surface-subtle"}`}
                  >
                    <span>{item.name}</span>
                    {isSelected && <Check aria-hidden="true" className="size-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VietnamAddressSelector;
