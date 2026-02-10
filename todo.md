# LEMC Coalition - Project TODO

## Database Schema & Migrations
- [x] Design and implement database schema for users, moto clubs, motorcycles, and passport check-ins
- [x] Create migration SQL for all tables
- [x] Execute migrations and verify database structure

## Internationalization (i18n)
- [x] Install and configure i18next for React
- [x] Create translation files for English (primary), Portuguese, and Spanish
- [x] Implement language switcher component
- [x] Translate all static content

## Design System & Theme
- [x] Define elegant color palette inspired by LEMC branding (gold, red, blue)
- [x] Configure Tailwind CSS custom theme
- [x] Import professional fonts (Google Fonts)
- [x] Create reusable card components for information display
- [x] Design navigation structure (public pages + dashboard for authenticated users)

## Member Profile System
- [x] Create member profile page with form fields
- [x] Implement photo upload functionality (profile picture)
- [x] Add fields: full name, road name, document number, associated moto club
- [x] Create profile view and edit modes
- [x] Add validation for all profile fields

## Motorcycle Garage
- [x] Create garage management page
- [x] Implement add motorcycle form (max 2 motorcycles per user)
- [x] Add fields: license plate, brand, model, photo
- [x] Create motorcycle card display component
- [x] Add edit and delete functionality for motorcycles
- [x] Enforce 2-motorcycle limit per user

## LEMC Passport (Travel Registry)
- [x] Integrate Google Maps API
- [x] Create passport page with map view
- [x] Implement location-based check-in system (lat/long)
- [x] Add search/autocomplete for locations
- [x] Display all check-ins as markers on map
- [x] Create check-in history list view
- [x] Store check-in data with timestamp and location details

## Moto Club Admin Panel
- [x] Create moto club data model (name, founding date, chapters)
- [x] Implement club admin role system
- [x] Create member registration approval workflow
- [x] Build pending requests dashboard
- [x] Add approve/reject functionality for member requests
- [x] Create club profile management page
- [x] Implement chapter management (add, edit, delete chapters with dates)

## General Admin Panel
- [x] Create super admin role
- [x] Build admin dashboard for platform oversight
- [ ] Add user management features (block, unblock, delete)
- [x] Create moto club management interface

## Public Pages & Information Cards
- [x] Create elegant landing page
- [x] Add "About the Coalition" section with history
- [x] Create cards for coalition information
- [x] Add events timeline section
- [ ] Create gallery section (optional)
- [ ] Add contact page

## Authentication & Authorization
- [x] Configure role-based access control (member, club_admin, super_admin)
- [x] Protect routes based on user roles
- [ ] Add terms of service and privacy policy acceptance
- [ ] Implement email confirmation flow

## Testing & Quality Assurance
- [ ] Write unit tests for critical procedures
- [ ] Test all user flows (registration, profile, garage, passport)
- [ ] Test admin workflows (approval, club management)
- [ ] Verify multilingual content across all pages
- [ ] Test responsive design on mobile and desktop
- [ ] Verify Google Maps integration

## Final Delivery
- [ ] Create comprehensive checkpoint
- [ ] Document all features and usage instructions
- [ ] Prepare deployment notes

## Logo e Identidade Visual
- [x] Copiar logo oficial para o diretório public
- [x] Substituir logo placeholder pela logo oficial
- [x] Ajustar cores do tema baseado na logo (dourado, azul marinho, vermelho)
- [x] Atualizar favicon com a logo
- [x] Verificar consistência visual em todas as páginas

## Correções de Design e Contraste
- [x] Trocar fonte para Calibri Bold
- [x] Alterar cor do texto principal para dourado
- [x] Adicionar imagem de fundo da estrada
- [x] Aplicar overlay preto com 75% de transparência sobre a imagem
- [x] Garantir legibilidade em todos os textos

## Melhorias de Acesso e Conteúdo
- [x] Tornar página inicial acessível sem login
- [x] Adicionar nome completo "International Coalition of Law Enforcement Motorcycle Clubs" em destaque dourado
- [x] Garantir que apenas áreas de perfil/admin exijam autenticação
