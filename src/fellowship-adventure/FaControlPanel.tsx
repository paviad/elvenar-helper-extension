import React from 'react';

// --- Types ---
interface FaControlPanelProps {
  mmEnchantmentEnabled: boolean;
  onToggleMmEnchantment: (enabled: boolean) => void;
  enchantmentBonus: number;
  onEnchantmentBonusChange: (value: number) => void;
}

const FaControlPanel: React.FC<FaControlPanelProps> = ({
  mmEnchantmentEnabled,
  onToggleMmEnchantment,
  enchantmentBonus,
  onEnchantmentBonusChange,
}) => {
  // Handlers
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEnchantmentBonusChange(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    // Clamp values for safety
    if (val > 100) val = 100;
    if (val < 0) val = 0;
    onEnchantmentBonusChange(val);
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>Configuration</h3>
      </div>

      <div style={styles.body}>
        {/* Toggle Row */}
        <div style={styles.row}>
          <div style={styles.labelGroup}>
            <span style={styles.labelText}>Assume MM Enchantment</span>
            {/* UPDATED HINT HERE */}
            <span style={styles.helperText}>Apply Magical Manufacturing</span>
          </div>

          {/* Custom Toggle Switch */}
          <label style={styles.switchContainer}>
            <input
              type='checkbox'
              checked={mmEnchantmentEnabled}
              onChange={(e) => onToggleMmEnchantment(e.target.checked)}
              style={styles.switchInput}
            />
            <span
              style={{
                ...styles.switchTrack,
                backgroundColor: mmEnchantmentEnabled ? '#1976d2' : '#b0b0b0',
              }}
            >
              <span
                style={{
                  ...styles.switchThumb,
                  transform: mmEnchantmentEnabled ? 'translateX(20px)' : 'translateX(0px)',
                }}
              />
            </span>
          </label>
        </div>

        <div style={styles.divider} />

        {/* Slider Row */}
        <div style={styles.sliderRow}>
          <div style={styles.labelGroup}>
            <span style={styles.labelText}>Enchantment Bonus</span>
            <span style={styles.valueDisplay}>+{enchantmentBonus}%</span>
          </div>

          <div style={styles.controlsContainer}>
            {/* Range Slider */}
            <input
              type='range'
              min='0'
              max='100'
              value={enchantmentBonus}
              onChange={handleSliderChange}
              style={styles.slider}
            />

            {/* Numeric Input */}
            <div style={styles.inputWrapper}>
              <input
                type='number'
                min='0'
                max='100'
                value={enchantmentBonus}
                onChange={handleInputChange}
                style={styles.numberInput}
              />
              <span style={styles.inputAdornment}>%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- CSS Styles ---
const styles: Record<string, React.CSSProperties> = {
  card: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
  },
  body: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  labelText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
  },
  helperText: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    width: '100%',
  },

  // --- Custom Switch Styles ---
  switchContainer: {
    position: 'relative',
    display: 'inline-block',
    width: '42px',
    height: '24px',
    cursor: 'pointer',
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  switchTrack: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transition: 'background-color .3s',
    borderRadius: '24px',
  },
  switchThumb: {
    position: 'absolute',
    content: '""',
    height: '18px',
    width: '18px',
    left: '3px',
    bottom: '3px',
    backgroundColor: 'white',
    transition: '.3s',
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },

  // --- Slider Section ---
  sliderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  valueDisplay: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#3b82f6',
    marginTop: '2px',
  },
  controlsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  slider: {
    flexGrow: 1,
    height: '4px',
    borderRadius: '2px',
    background: '#e2e8f0',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#1976d2',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '4px 8px',
    width: '70px',
    transition: 'border-color 0.2s',
  },
  numberInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
    textAlign: 'right',
  },
  inputAdornment: {
    color: '#64748b',
    fontSize: '12px',
    fontWeight: 500,
    marginLeft: '2px',
  },
};

export default FaControlPanel;
