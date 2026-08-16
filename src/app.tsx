import { RegisterForm } from '@/components/register-form'
import { UserForm } from '@/components/user-form'

export default function App() {
  return (
    <main className='container mx-auto space-y-4 p-4'>
      <RegisterForm />

      <UserForm />
    </main>
  )
}
