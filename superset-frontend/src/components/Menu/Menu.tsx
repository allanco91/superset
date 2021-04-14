/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useState } from 'react';
import { t, styled } from '@superset-ui/core';
import { Nav, Navbar, NavItem, Image, OverlayTrigger, Popover, Button, NavDropdown } from 'react-bootstrap';
import { Menu as DropdownMenu } from 'src/common/components';
import { Link } from 'react-router-dom';
import MenuObject, {
  MenuObjectProps,
  MenuObjectChildProps,
} from './MenuObject';
import LanguagePicker, { Languages } from './LanguagePicker';

interface BrandProps {
  path: string;
  icon: string;
  alt: string;
  width: string | number;
}

interface NavBarProps {
  bug_report_url?: string;
  version_string?: string;
  version_sha?: string;
  documentation_url?: string;
  languages: Languages;
  show_language_picker: boolean;
  user_is_anonymous: boolean;
  user_info_url: string;
  user_login_url: string;
  user_logout_url: string;
  user_profile_url: string | null;
  user_name?: string;
  atlas_profile_url?: string;
  atlas_profile_picture?: string;
  locale: string;
}

export interface MenuProps {
  data: {
    menu: MenuObjectProps[];
    brand: BrandProps;
    navbar_right: NavBarProps;
    settings: MenuObjectProps[];
  };
  isFrontendRoute?: (path?: string) => boolean;
}

const StyledHeader = styled.header``;

export function Menu({
  data: { menu, brand, navbar_right: navbarRight, settings },
  isFrontendRoute = () => false,
}: MenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const popover = (
    <Popover
      id="popover-positioned-bottom"
    >
      <h5>{navbarRight.user_name}</h5>
      <Button
        as="a"
        href={navbarRight.atlas_profile_url}
        target="_blank"
      >
        Meus dados
      </Button>
      {" "}
      <Button
        as="a"
        href={navbarRight.user_logout_url}
      >
        Sair
      </Button>
    </Popover>
  );

  return (
    <StyledHeader className="top menu-navbar" id="main-menu">
      <Navbar inverse fluid staticTop role="navigation" className="primary">
        <Navbar.Header>
          <Navbar.Brand>
            <a className="navbar-brand" href={brand.path}>
              <img width={brand.width} src={brand.icon} alt={brand.alt} />
            </a>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
        <Nav data-test="navbar-top">
          {menu.map((item, index) => {
            const props = {
              ...item,
              isFrontendRoute: isFrontendRoute(item.url),
              childs: item.childs?.map(c => {
                if (typeof c === 'string') {
                  return c;
                }

                return {
                  ...c,
                  isFrontendRoute: isFrontendRoute(c.url),
                };
              }),
            };
            return <MenuObject {...props} key={item.label} index={index + 1} />;
          })}
        </Nav>
        <Nav className="navbar-right">
          <OverlayTrigger
            trigger="click"
            placement="bottom"
            overlay={popover}
          >
            <Image
              circle
              className="margin-m"
              src={navbarRight.atlas_profile_picture}
              height={35}
            />
          </OverlayTrigger>
          {navbarRight.atlas_profile_picture?.includes("ba073007-1bcc-4a0a-61a9-08d54e24a5ec") &&
            <NavDropdown
              id="settings-dropdown"
              className="menu-dropdown"
              title={t('Settings')}
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
              onToggle={value => setDropdownOpen(value)}
              open={dropdownOpen}
            >
              <DropdownMenu>
                {settings.map((section, index) => [
                  <DropdownMenu.ItemGroup
                    key={`${section.label}`}
                    title={section.label}
                  >
                    {section.childs?.map(child => {
                      if (typeof child !== 'string') {
                        return (
                          <DropdownMenu.Item key={`${child.label}`}>
                            {isFrontendRoute(child.url) ? (
                              <Link to={child.url || ''}>{child.label}</Link>
                            ) : (
                              <a href={child.url}>{child.label}</a>
                            )}
                          </DropdownMenu.Item>
                        );
                      }
                      return null;
                    })}
                  </DropdownMenu.ItemGroup>,
                  index < settings.length - 1 && <DropdownMenu.Divider />,
                ])}

                {!navbarRight.user_is_anonymous && [
                  <DropdownMenu.Divider key="user-divider" />,
                  <DropdownMenu.ItemGroup key="user-section" title={t('User')}>
                    {navbarRight.user_profile_url && (
                      <DropdownMenu.Item key="profile">
                        <a href={navbarRight.user_profile_url}>{t('Profile')}</a>
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Item key="info">
                      <a href={navbarRight.user_info_url}>{t('Info')}</a>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item key="logout">
                      <a href={navbarRight.user_logout_url}>{t('Logout')}</a>
                    </DropdownMenu.Item>
                  </DropdownMenu.ItemGroup>,
                ]}
                {(navbarRight.version_string || navbarRight.version_sha) && [
                  <DropdownMenu.Divider key="version-info-divider" />,
                  <DropdownMenu.ItemGroup key="about-section" title={t('About')}>
                    <div className="about-section">
                      {navbarRight.version_string && (
                        <li className="version-info">
                          <span>Version: {navbarRight.version_string}</span>
                        </li>
                      )}
                      {navbarRight.version_sha && (
                        <li className="version-info">
                          <span>SHA: {navbarRight.version_sha}</span>
                        </li>
                      )}
                    </div>
                  </DropdownMenu.ItemGroup>,
                ]}
              </DropdownMenu>
            </NavDropdown>
          }
          {navbarRight.documentation_url && (
            <NavItem
              href={navbarRight.documentation_url}
              target="_blank"
              title="Documentation"
            >
              <i className="fa fa-question" />
              &nbsp;
            </NavItem>
          )}
          {navbarRight.bug_report_url && (
            <NavItem
              href={navbarRight.bug_report_url}
              target="_blank"
              title="Report a Bug"
            >
              <i className="fa fa-bug" />
              &nbsp;
            </NavItem>
          )}
          {navbarRight.show_language_picker && (
            <LanguagePicker
              locale={navbarRight.locale}
              languages={navbarRight.languages}
            />
          )}
          {navbarRight.user_is_anonymous && (
            <NavItem href={navbarRight.user_login_url}>
              <i className="fa fa-fw fa-sign-in" />
              {t('Login')}
            </NavItem>
          )}
        </Nav>
      </Navbar>
    </StyledHeader>
  );
}

// transform the menu data to reorganize components
export default function MenuWrapper({ data, ...rest }: MenuProps) {
  const newMenuData = {
    ...data,
  };
  // Menu items that should go into settings dropdown
  const settingsMenus = {
    Security: true,
    Manage: true,
  };

  // Cycle through menu.menu to build out cleanedMenu and settings
  const cleanedMenu: MenuObjectProps[] = [];
  const settings: MenuObjectProps[] = [];
  newMenuData.menu.forEach((item: any) => {
    if (!item) {
      return;
    }

    const children: (MenuObjectProps | string)[] = [];
    const newItem = {
      ...item,
    };

    // Filter childs
    if (item.childs) {
      item.childs.forEach((child: MenuObjectChildProps | string) => {
        if (typeof child === 'string') {
          children.push(child);
        } else if ((child as MenuObjectChildProps).label) {
          children.push(child);
        }
      });

      newItem.childs = children;
    }

    if (!settingsMenus.hasOwnProperty(item.name)) {
      cleanedMenu.push(newItem);
    } else {
      settings.push(newItem);
    }
  });

  newMenuData.menu = cleanedMenu;
  newMenuData.settings = settings;

  return <Menu data={newMenuData} {...rest} />;
}
