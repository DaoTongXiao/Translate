import React, { useState } from 'react';

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
  action?: () => void;
}

interface MenuBarProps {
  items: MenuItem[];
}

const MenuBar: React.FC<MenuBarProps> = ({ items }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleMenuClick = (menuId: string) => {
    if (activeMenu === menuId) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menuId);
    }
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
    }
    setActiveMenu(null);
  };

  // 点击菜单外部时关闭菜单
  const handleClickOutside = () => {
    setActiveMenu(null);
  };

  return (
    <div className="sidebar-menu">
      <div className="sidebar-menu-items">
        {items.map((item) => (
          <div key={item.id} className="sidebar-menu-item-container">
            <div
              className={`sidebar-menu-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
            >
              {item.icon && <span className="sidebar-menu-item-icon">{item.icon}</span>}
              <span className="sidebar-menu-item-label">{item.label}</span>
            </div>
            {item.children && activeMenu === item.id && (
              <div className="sidebar-dropdown">
                {item.children.map((child) => (
                  <div
                    key={child.id}
                    className="sidebar-dropdown-item"
                    onClick={() => handleMenuItemClick(child)}
                  >
                    {child.icon && <span className="sidebar-dropdown-item-icon">{child.icon}</span>}
                    <span className="sidebar-dropdown-item-label">{child.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {activeMenu && (
        <div className="sidebar-overlay" onClick={handleClickOutside}></div>
      )}
    </div>
  );
};

export default MenuBar;
