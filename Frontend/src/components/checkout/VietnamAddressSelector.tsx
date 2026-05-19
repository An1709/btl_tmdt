import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { vietnamAddresses, type VietnamDistrict, type VietnamProvince } from "@/data/vietnamAddresses";

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

const VietnamAddressSelector = ({ value, onChange, error }: VietnamAddressSelectorProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
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

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const openPicker = () => {
    setIsOpen(true);
    setSearch("");

    if (!value.province) {
      setActiveStep("province");
    } else if (!value.district) {
      setActiveStep("district");
    } else if (!value.ward) {
      setActiveStep("ward");
    }
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
    onChange({
      ...value,
      ward: ward.name,
      wardCode: ward.code,
    });
    setIsOpen(false);
    setSearch("");
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
  };

  const handleSelect = (item: (typeof visibleItems)[number]) => {
    if (activeStep === "province") selectProvince(item as VietnamProvince);
    if (activeStep === "district") selectDistrict(item as VietnamDistrict);
    if (activeStep === "ward") selectWard(item as VietnamDistrict["wards"][number]);
  };

  const canOpenStep = (step: AddressStep) => {
    if (step === "province") return true;
    if (step === "district") return Boolean(selectedProvince);
    return Boolean(selectedDistrict);
  };

  return (
    <div ref={wrapperRef} className="relative sm:col-span-2">
      <button
        type="button"
        onClick={openPicker}
        aria-expanded={isOpen}
        className={`w-full px-4 py-3 rounded-xl border bg-muted/30 text-sm text-left transition-all flex items-center gap-3 ${
          error
            ? "border-red-400 focus:ring-red-400/30"
            : "border-border focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)]"
        } focus:outline-none focus:ring-2`}
      >
        <span className={`flex-1 truncate ${summary ? "text-foreground" : "text-muted-foreground"}`}>
          {summary || "Chọn Tỉnh/Thành phố, Quận/Huyện, Phường/Xã"}
        </span>
        {summary && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Xóa địa chỉ đã chọn"
            onClick={(event) => {
              event.stopPropagation();
              clearSelection();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                clearSelection();
              }
            }}
            className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X size={14} />
          </span>
        )}
        <ChevronDown size={16} className="text-muted-foreground shrink-0" />
      </button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {isOpen && (
        <div className="absolute z-40 mt-2 w-full rounded-2xl border border-border bg-white dark:bg-card shadow-2xl overflow-hidden">
          <div className="grid grid-cols-3 border-b border-border bg-muted/30">
            {(Object.keys(STEP_LABELS) as AddressStep[]).map((step) => (
              <button
                key={step}
                type="button"
                disabled={!canOpenStep(step)}
                onClick={() => {
                  setActiveStep(step);
                  setSearch("");
                }}
                className={`px-3 py-3 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeStep === step
                    ? "text-[var(--pet-coral)] border-b-2 border-[var(--pet-coral)] bg-white dark:bg-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {STEP_LABELS[step]}
              </button>
            ))}
          </div>

          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Tìm ${STEP_LABELS[activeStep].toLowerCase()}...`}
                className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {visibleItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Không tìm thấy địa chỉ phù hợp.</p>
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
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all ${
                      isSelected
                        ? "bg-red-50 text-[var(--pet-coral)] dark:bg-red-950/20"
                        : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <span>{item.name}</span>
                    {isSelected && <Check size={16} className="shrink-0" />}
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
