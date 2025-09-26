import React, { useState, useImperativeHandle, forwardRef } from "react";
import { DayPicker } from "react-day-picker";
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';

const DateTimePicker = forwardRef(({ value, onChange, showTime = false, className }, ref) => {
  const [date, setDate] = useState(value || null);
  const [time, setTime] = useState(value ? formatTime(value) : "00:00");

  function formatTime(date) {
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  React.useEffect(() => {
    setDate(value || null);
    setTime(value ? formatTime(value) : "00:00");
  }, [value]);

  const onDaySelect = (selectedDay) => {
    if (!selectedDay) return;

    let newDate = new Date(selectedDay);
    if (showTime) {
      if (date) {
        newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
      } else {
        const [h, m] = time.split(":").map(Number);
        newDate.setHours(h, m, 0, 0);
      }
    } else {
      newDate.setHours(0, 0, 0, 0);
    }
    setDate(newDate);
    onChange && onChange(newDate);
  };

  const onTimeChange = (e) => {
    let newTime = e.target.value;

    let [h, m] = newTime.split(":").map(Number);

    if (isNaN(h) || h < 0) h = 0;
    if (isNaN(m) || m < 0) m = 0;

    if (m > 59) m = 59;
    if (h > 23) h = 23;

    const correctedTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

    setTime(correctedTime);

    if (!date) return;

    const newDate = new Date(date);
    newDate.setHours(h, m, 0, 0);

    setDate(newDate);
    onChange && onChange(newDate);
  };



  // Exponer métodos o propiedades al ref (opcional)
  useImperativeHandle(ref, () => ({
    reset: () => {
      setDate(null);
      setTime("00:00");
    },
    getDate: () => date,
  }));

  return (
    <>
      <style>
        {`
          .rdp-caption_label {
            text-transform: capitalize !important;
          }
        `}
      </style>
      <div className={`p-4 max-w-s ${className || ''}`}>
        <DayPicker
          mode="single"
          locale={es}
          selected={date}
          onSelect={onDaySelect}
          fixedWeeks={true}
          showOutsideDays={true}
        />
        {showTime && (
          <input
            type="time"
            value={time}
            onChange={onTimeChange}
            className="mt-2 w-full border rounded p-1"
          />
        )}
      </div>
    </>
  );
});

DateTimePicker.displayName = "DateTimePicker";

export default DateTimePicker;
